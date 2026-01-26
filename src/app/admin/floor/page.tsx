"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addFloorArea,
  addFloorObject,
  addFloorTable,
  deleteFloorArea,
  deleteFloorObject,
  deleteFloorTable,
  listFloorAreas,
  listFloorObjects,
  listRestaurantFloorTables,
  listFloorTables,
  updateFloorArea,
  updateFloorObject,
  updateFloorTable,
  type FloorArea,
  type FloorObject,
  type FloorObjectKind,
  type FloorTable,
  type FloorTableShape,
} from "@/lib/floorPlan";
import { getRestaurant, getSetupContext } from "@/lib/setupData";

type Role = "owner" | "manager" | "cashier" | null;

type Selected =
  | { kind: "table"; row: FloorTable }
  | { kind: "object"; row: FloorObject }
  | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AdminFloorPlanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);

  const [areas, setAreas] = useState<FloorArea[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  const [tables, setTables] = useState<FloorTable[]>([]);
  const [objects, setObjects] = useState<FloorObject[]>([]);

  const [newAreaName, setNewAreaName] = useState<string>("");

  const [selected, setSelected] = useState<Selected>(null);

  const canEdit = role === "owner" || role === "manager";

  async function refreshAreas(rid: string) {
    const res = await listFloorAreas(rid);
    if (res.error) throw res.error;
    const next = res.data ?? [];
    setAreas(next);
    if (!activeAreaId && next.length > 0) setActiveAreaId(next[0].id);
    if (activeAreaId && next.every((a) => a.id !== activeAreaId)) {
      setActiveAreaId(next.length > 0 ? next[0].id : null);
    }
  }

  async function refreshAreaContents(areaId: string) {
    const [tRes, oRes] = await Promise.all([listFloorTables(areaId), listFloorObjects(areaId)]);
    if (tRes.error) throw tRes.error;
    if (oRes.error) throw oRes.error;
    setTables(tRes.data ?? []);
    setObjects(oRes.data ?? []);
    setSelected(null);
  }

  const activeArea = useMemo(() => {
    if (!activeAreaId) return null;
    return areas.find((a) => a.id === activeAreaId) ?? null;
  }, [areas, activeAreaId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const rawRole = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      const resolvedRole: Role = rawRole === "owner" || rawRole === "manager" || rawRole === "cashier" ? rawRole : null;
      setRole(resolvedRole);

      if (resolvedRole === "cashier") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      if (!resolvedRole) {
        const restaurantRes = await getRestaurant(rid);
        if (cancelled) return;
        if (restaurantRes.data?.owner_user_id === ctx.session.user.id) setRole("owner");
      }

      try {
        await refreshAreas(rid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load floor plan";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!activeAreaId) {
      setTables([]);
      setObjects([]);
      setSelected(null);
      return;
    }

    const areaId = activeAreaId;
    let cancelled = false;
    async function loadArea() {
      setError(null);
      try {
        await refreshAreaContents(areaId);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load area";
        setError(msg);
      }
    }

    void loadArea();
    return () => {
      cancelled = true;
    };
  }, [activeAreaId]);

  async function onAddArea(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !canEdit) return;
    setError(null);

    const name = newAreaName.trim();
    if (!name) return;

    const maxSort = areas.reduce((acc, a) => Math.max(acc, a.sort_order ?? 0), 0);
    const res = await addFloorArea({ restaurant_id: restaurantId, name, sort_order: maxSort + 1 });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewAreaName("");
    await refreshAreas(restaurantId);
    if (res.data?.id) setActiveAreaId(res.data.id);
  }

  async function onDeleteArea(areaId: string) {
    if (!restaurantId || !canEdit) return;
    setError(null);

    const res = await deleteFloorArea(areaId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refreshAreas(restaurantId);
  }

  async function onUpdateAreaSize(width: number, height: number) {
    if (!canEdit || !activeAreaId) return;
    setError(null);

    const w = clamp(Math.floor(width), 400, 3000);
    const h = clamp(Math.floor(height), 300, 2000);

    const res = await updateFloorArea({ id: activeAreaId, width: w, height: h });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    if (restaurantId) await refreshAreas(restaurantId);
  }

  async function onAddTable() {
    if (!restaurantId || !activeAreaId || !canEdit) return;
    setError(null);

    const allRes = await listRestaurantFloorTables(restaurantId);
    if (allRes.error) {
      setError(allRes.error.message);
      return;
    }

    const used = new Set((allRes.data ?? []).map((t) => t.table_number));
    let nextNum = 1;
    while (used.has(nextNum)) nextNum += 1;

    const res = await addFloorTable({
      restaurant_id: restaurantId,
      area_id: activeAreaId,
      table_number: nextNum,
      seats: 4,
      shape: "square",
      width: 120,
      height: 120,
      x: 40,
      y: 40,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refreshAreaContents(activeAreaId);
  }

  async function onAddObject(kind: FloorObjectKind) {
    if (!restaurantId || !activeAreaId || !canEdit) return;
    setError(null);

    const res = await addFloorObject({
      restaurant_id: restaurantId,
      area_id: activeAreaId,
      kind,
      label: kind === "door" ? "Entrance" : "Bar",
      x: 40,
      y: 200,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refreshAreaContents(activeAreaId);
  }

  async function persistSelected(next: Selected) {
    if (!canEdit || !activeArea) return;
    if (!next) return;

    setError(null);

    if (next.kind === "table") {
      const row = next.row;
      const res = await updateFloorTable({
        id: row.id,
        table_number: row.table_number,
        seats: row.seats,
        shape: row.shape,
        width: row.width,
        height: row.height,
        x: clamp(row.x, 0, Math.max(0, activeArea.width - 10)),
        y: clamp(row.y, 0, Math.max(0, activeArea.height - 10)),
      });
      if (res.error) setError(res.error.message);
      return;
    }

    const row = next.row;
    const res = await updateFloorObject({
      id: row.id,
      label: row.label,
      width: row.width,
      height: row.height,
      x: clamp(row.x, 0, Math.max(0, activeArea.width - 10)),
      y: clamp(row.y, 0, Math.max(0, activeArea.height - 10)),
    });
    if (res.error) setError(res.error.message);
  }

  async function onDeleteSelected() {
    if (!canEdit || !activeAreaId || !selected) return;
    setError(null);

    if (selected.kind === "table") {
      const res = await deleteFloorTable(selected.row.id);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      await refreshAreaContents(activeAreaId);
      return;
    }

    const res = await deleteFloorObject(selected.row.id);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await refreshAreaContents(activeAreaId);
  }

  function beginDrag(kind: "table" | "object", id: string, e: React.MouseEvent) {
    if (!canEdit || !activeArea) return;

    const areaWidth = activeArea.width;
    const areaHeight = activeArea.height;

    const target = kind === "table" ? tables.find((t) => t.id === id) : objects.find((o) => o.id === id);
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    if (kind === "table") setSelected({ kind: "table", row: target as FloorTable });
    else setSelected({ kind: "object", row: target as FloorObject });

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = (target as { x: number }).x;
    const startY = (target as { y: number }).y;

    let latestX = startX;
    let latestY = startY;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;

      latestX = clamp(Math.round(startX + dx), 0, areaWidth - 10);
      latestY = clamp(Math.round(startY + dy), 0, areaHeight - 10);

      if (kind === "table") {
        setTables((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  x: latestX,
                  y: latestY,
                }
              : t,
          ),
        );
      } else {
        setObjects((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  x: latestX,
                  y: latestY,
                }
              : o,
          ),
        );
      }
    }

    async function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      if (kind === "table") {
        const res = await updateFloorTable({ id, x: latestX, y: latestY });
        if (res.error) setError(res.error.message);
      } else {
        const res = await updateFloorObject({ id, x: latestX, y: latestY });
        if (res.error) setError(res.error.message);
      }

      if (activeAreaId) await refreshAreaContents(activeAreaId);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Floor Plan</h1>
            <p className="text-sm text-[var(--mp-muted)]">Create areas and arrange tables, doors, and bar counters.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            Back
          </button>
        </div>

        {!canEdit ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your role does not allow editing the floor plan.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveAreaId(a.id)}
                  className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                    activeAreaId === a.id
                      ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            <form onSubmit={onAddArea} className="flex w-full max-w-md gap-2">
              <input
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                disabled={!canEdit}
                placeholder="New area (e.g. Main, Patio)"
                className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <button
                type="submit"
                disabled={!canEdit || !newAreaName.trim()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                Add
              </button>
            </form>
          </div>

          {activeArea ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <div
                  className="relative overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-[var(--mp-bg)]"
                  style={{ width: "100%", height: 520 }}
                  onMouseDown={() => setSelected(null)}
                >
                  <div
                    className="relative"
                    style={{ width: activeArea.width, height: activeArea.height, transformOrigin: "top left" }}
                  >
                    {objects.map((o) => (
                      <div
                        key={o.id}
                        onMouseDown={(e) => beginDrag("object", o.id, e)}
                        className={`absolute cursor-move select-none rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${
                          selected?.kind === "object" && selected.row.id === o.id
                            ? "border-[var(--mp-primary)] bg-white"
                            : "border-[var(--mp-border)] bg-white/90"
                        }`}
                        style={{ left: o.x, top: o.y, width: o.width, height: o.height }}
                        title={o.kind}
                      >
                        {o.kind === "door" ? "Door" : "Bar"}
                        {o.label ? `: ${o.label}` : ""}
                      </div>
                    ))}

                    {tables.map((t) => (
                      <div
                        key={t.id}
                        onMouseDown={(e) => beginDrag("table", t.id, e)}
                        className={`absolute grid cursor-move select-none place-items-center border text-sm font-bold shadow-sm ${
                          selected?.kind === "table" && selected.row.id === t.id
                            ? "border-[var(--mp-primary)] bg-white"
                            : "border-[var(--mp-border)] bg-white/90"
                        } ${t.shape === "round" ? "rounded-full" : "rounded-2xl"}`}
                        style={{ left: t.x, top: t.y, width: t.width, height: t.height }}
                        title={`Table ${t.table_number}`}
                      >
                        {t.table_number}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onAddTable}
                    disabled={!canEdit}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                  >
                    Add table
                  </button>
                  <button
                    type="button"
                    onClick={() => void onAddObject("door")}
                    disabled={!canEdit}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Add door
                  </button>
                  <button
                    type="button"
                    onClick={() => void onAddObject("bar")}
                    disabled={!canEdit}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Add bar
                  </button>

                  <button
                    type="button"
                    onClick={() => void onDeleteArea(activeArea.id)}
                    disabled={!canEdit}
                    className="ml-auto inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Delete area
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
                <div className="text-sm font-semibold">Area settings</div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                    Width
                    <input
                      type="number"
                      defaultValue={activeArea.width}
                      min={400}
                      max={3000}
                      disabled={!canEdit}
                      onBlur={(e) => void onUpdateAreaSize(Number(e.target.value), activeArea.height)}
                      className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                    Height
                    <input
                      type="number"
                      defaultValue={activeArea.height}
                      min={300}
                      max={2000}
                      disabled={!canEdit}
                      onBlur={(e) => void onUpdateAreaSize(activeArea.width, Number(e.target.value))}
                      className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    />
                  </label>
                </div>

                <div className="mt-6 text-sm font-semibold">Selected</div>

                {!selected ? (
                  <div className="mt-2 text-sm text-[var(--mp-muted)]">Click a table/object to edit it.</div>
                ) : selected.kind === "table" ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                      Table number
                      <input
                        type="number"
                        value={selected.row.table_number}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setSelected({
                            kind: "table",
                            row: { ...selected.row, table_number: Number(e.target.value) },
                          })
                        }
                        onBlur={() => void persistSelected(selected)}
                        className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Seats
                        <input
                          type="number"
                          value={selected.row.seats}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setSelected({ kind: "table", row: { ...selected.row, seats: Number(e.target.value) } })
                          }
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Shape
                        <select
                          value={selected.row.shape}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setSelected({
                              kind: "table",
                              row: { ...selected.row, shape: e.target.value as FloorTableShape },
                            })
                          }
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        >
                          <option value="round">Round</option>
                          <option value="square">Square</option>
                          <option value="rectangle">Rectangle</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Width
                        <input
                          type="number"
                          value={selected.row.width}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setSelected({ kind: "table", row: { ...selected.row, width: Number(e.target.value) } })
                          }
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Height
                        <input
                          type="number"
                          value={selected.row.height}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setSelected({ kind: "table", row: { ...selected.row, height: Number(e.target.value) } })
                          }
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        X
                        <input
                          type="number"
                          value={selected.row.x}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "table", row: { ...selected.row, x: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Y
                        <input
                          type="number"
                          value={selected.row.y}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "table", row: { ...selected.row, y: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDeleteSelected()}
                      disabled={!canEdit}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
                    >
                      Delete table
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="text-xs font-semibold text-[var(--mp-muted)]">{selected.row.kind.toUpperCase()}</div>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                      Label
                      <input
                        value={selected.row.label ?? ""}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setSelected({
                            kind: "object",
                            row: { ...selected.row, label: e.target.value },
                          })
                        }
                        onBlur={() => void persistSelected(selected)}
                        className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Width
                        <input
                          type="number"
                          value={selected.row.width}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "object", row: { ...selected.row, width: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Height
                        <input
                          type="number"
                          value={selected.row.height}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "object", row: { ...selected.row, height: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        X
                        <input
                          type="number"
                          value={selected.row.x}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "object", row: { ...selected.row, x: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mp-muted)]">
                        Y
                        <input
                          type="number"
                          value={selected.row.y}
                          disabled={!canEdit}
                          onChange={(e) => setSelected({ kind: "object", row: { ...selected.row, y: Number(e.target.value) } })}
                          onBlur={() => void persistSelected(selected)}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDeleteSelected()}
                      disabled={!canEdit}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
                    >
                      Delete object
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-[var(--mp-muted)]">Add an area to start (e.g. Main).</div>
          )}
        </div>
      </div>
    </div>
  );
}
