"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { loadPosMenuData, listOpenDineInOrders, type DineInTableOrder } from "@/lib/posData";
import {
  listFloorAreas,
  listFloorObjects,
  listFloorTables,
  type FloorArea,
  type FloorObject,
  type FloorTable,
} from "@/lib/floorPlan";

type TableRow = {
  tableNumber: number;
  openOrder: DineInTableOrder | null;
};

type TableLocalStatus = "available" | "seated" | "order_in_progress" | "served" | "needs_cleaning";

type TableMeta = {
  tableNumber: number;
  guests?: number | null;
  server?: string | null;
  status?: TableLocalStatus | null;
  updatedAt?: string;
};

const DEFAULT_TABLE_COUNT = 20;
const TABLE_COUNT_KEY = "pos.table_count";

export default function PosTablesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tableCount, setTableCount] = useState<number>(DEFAULT_TABLE_COUNT);
  const [orders, setOrders] = useState<DineInTableOrder[]>([]);

  const [areas, setAreas] = useState<FloorArea[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [floorTables, setFloorTables] = useState<FloorTable[]>([]);
  const [floorObjects, setFloorObjects] = useState<FloorObject[]>([]);

  const [tableMetaByNumber, setTableMetaByNumber] = useState<Record<number, TableMeta>>({});

  const [showTableActions, setShowTableActions] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedOpenOrder, setSelectedOpenOrder] = useState<DineInTableOrder | null>(null);

  const [showSeatGuests, setShowSeatGuests] = useState(false);
  const [seatGuestsCount, setSeatGuestsCount] = useState<string>("");
  const [seatServerName, setSeatServerName] = useState<string>("");

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferToTable, setTransferToTable] = useState<string>("");

  function metaStorageKey(rid: string) {
    return `islapos_table_meta_${rid}`;
  }

  function loadTableMeta(rid: string) {
    try {
      const raw = window.localStorage.getItem(metaStorageKey(rid));
      const parsed = raw ? (JSON.parse(raw) as Record<string, TableMeta>) : {};
      const next: Record<number, TableMeta> = {};
      for (const [k, v] of Object.entries(parsed ?? {})) {
        const n = Number(k);
        if (!Number.isFinite(n) || !v) continue;
        next[n] = { ...v, tableNumber: n };
      }
      return next;
    } catch {
      return {};
    }
  }

  function saveTableMeta(rid: string, next: Record<number, TableMeta>) {
    setTableMetaByNumber(next);
    try {
      const asStringKeys: Record<string, TableMeta> = {};
      for (const [k, v] of Object.entries(next)) {
        asStringKeys[String(k)] = v;
      }
      window.localStorage.setItem(metaStorageKey(rid), JSON.stringify(asStringKeys));
    } catch {
      // ignore
    }
  }

  function upsertTableMeta(rid: string, tableNumber: number, patch: Partial<TableMeta>) {
    const prev = tableMetaByNumber;
    const base = prev[tableNumber] ?? { tableNumber };
    const next = {
      ...prev,
      [tableNumber]: {
        ...base,
        ...patch,
        tableNumber,
        updatedAt: new Date().toISOString(),
      },
    };
    saveTableMeta(rid, next);
  }

  function openTableActions(tableNumber: number, openOrder: DineInTableOrder | null) {
    setSelectedTableNumber(tableNumber);
    setSelectedOpenOrder(openOrder);
    setShowSeatGuests(false);
    setSeatGuestsCount("");
    setSeatServerName("");
    setShowTransfer(false);
    setTransferToTable("");
    setShowTableActions(true);
  }

  async function reloadOpenOrders(nextRestaurantId: string) {
    const dineIn = await listOpenDineInOrders(nextRestaurantId);
    if (dineIn.error) throw dineIn.error;
    setOrders(dineIn.data ?? []);
  }

  async function reloadActiveArea(nextAreaId: string) {
    const [tRes, oRes] = await Promise.all([listFloorTables(nextAreaId), listFloorObjects(nextAreaId)]);
    if (tRes.error) throw tRes.error;
    if (oRes.error) throw oRes.error;
    setFloorTables(tRes.data ?? []);
    setFloorObjects(oRes.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      try {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(TABLE_COUNT_KEY) : null;
        const parsed = stored ? Number(stored) : NaN;
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) setTableCount(parsed);

        // Check if offline
        const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

        // Try to get cached menu first
        const cachedMenu = typeof window !== "undefined" ? window.localStorage.getItem("islapos_cached_menu") : null;
        let menuData = null;

        if (isOffline && cachedMenu) {
          try {
            menuData = JSON.parse(cachedMenu);
            setRestaurantId(menuData.restaurantId);
            // Load cached floor plan data when offline
            const cachedFloorPlan = window.localStorage.getItem("islapos_cached_floor_plan");
            if (cachedFloorPlan) {
              const floorData = JSON.parse(cachedFloorPlan);
              setAreas(floorData.areas ?? []);
              if (floorData.areas?.length > 0) {
                setActiveAreaId(floorData.areas[0].id);
                // Load cached tables for first area
                const cachedTables = window.localStorage.getItem(`islapos_cached_floor_tables_${floorData.areas[0].id}`);
                if (cachedTables) {
                  const tablesData = JSON.parse(cachedTables);
                  setFloorTables(tablesData.tables ?? []);
                  setFloorObjects(tablesData.objects ?? []);
                }
              }
            } else {
              setAreas([]);
            }
            setOrders([]);
            setLoading(false);
            return;
          } catch {
            // ignore parse error
          }
        }

        if (isOffline && !cachedMenu) {
          setError("No internet and no cached data available");
          setLoading(false);
          return;
        }

        const res = await loadPosMenuData();
        if (cancelled) return;

        if (res.error) {
          if (res.error.message.toLowerCase().includes("signed")) {
            router.replace("/login");
            return;
          }
          if (res.error.message.toLowerCase().includes("setup")) {
            router.replace("/setup");
            return;
          }
          throw res.error;
        }

        setRestaurantId(res.data.restaurantId);

        if (typeof window !== "undefined") {
          setTableMetaByNumber(loadTableMeta(res.data.restaurantId));
        }

        const areasRes = await listFloorAreas(res.data.restaurantId);
        if (cancelled) return;
        if (areasRes.error) throw areasRes.error;
        const nextAreas = areasRes.data ?? [];
        setAreas(nextAreas);
        
        // Cache ALL floor plan data for offline use (areas + all tables)
        try {
          // Cache areas
          window.localStorage.setItem("islapos_cached_floor_plan", JSON.stringify({ areas: nextAreas }));
          
          // Cache tables for ALL areas (not just the active one)
          for (const area of nextAreas) {
            const [tRes, oRes] = await Promise.all([listFloorTables(area.id), listFloorObjects(area.id)]);
            if (cancelled) return;
            if (!tRes.error && !oRes.error) {
              window.localStorage.setItem(`islapos_cached_floor_tables_${area.id}`, JSON.stringify({
                tables: tRes.data ?? [],
                objects: oRes.data ?? [],
              }));
            }
          }
        } catch {
          // ignore storage errors
        }
        
        if (nextAreas.length > 0) setActiveAreaId((prev) => prev ?? nextAreas[0].id);

        await reloadOpenOrders(res.data.restaurantId);
        if (cancelled) return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load tables";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void load();

    // Skip auth listener when offline
    const isOfflineNow = typeof navigator !== "undefined" ? !navigator.onLine : false;
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (!isOfflineNow) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) router.replace("/login");
      });
      authListener = data;
    }

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!restaurantId) return;
    if (typeof window === "undefined") return;
    setTableMetaByNumber(loadTableMeta(restaurantId));
  }, [restaurantId]);

  useEffect(() => {
    if (!activeAreaId) {
      setFloorTables([]);
      setFloorObjects([]);
      return;
    }

    // When offline, load cached tables for this area
    const isOfflineNow = typeof navigator !== "undefined" ? !navigator.onLine : false;
    if (isOfflineNow) {
      try {
        const cachedTables = window.localStorage.getItem(`islapos_cached_floor_tables_${activeAreaId}`);
        if (cachedTables) {
          const tablesData = JSON.parse(cachedTables);
          setFloorTables(tablesData.tables ?? []);
          setFloorObjects(tablesData.objects ?? []);
        }
      } catch {
        // ignore parse error
      }
      return;
    }

    const areaId = activeAreaId;
    let cancelled = false;

    async function loadArea() {
      setError(null);
      try {
        const [tRes, oRes] = await Promise.all([listFloorTables(areaId), listFloorObjects(areaId)]);
        if (tRes.error) throw tRes.error;
        if (oRes.error) throw oRes.error;
        setFloorTables(tRes.data ?? []);
        setFloorObjects(oRes.data ?? []);
        
        // Cache tables for offline use
        try {
          window.localStorage.setItem(`islapos_cached_floor_tables_${areaId}`, JSON.stringify({
            tables: tRes.data ?? [],
            objects: oRes.data ?? [],
          }));
        } catch {
          // ignore storage errors
        }
      } catch (e) {
        if (cancelled) return;
        // Don't show error if we went offline
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        const msg = e instanceof Error ? e.message : "Failed to load floor plan";
        setError(msg);
      }
    }

    void loadArea();
    return () => {
      cancelled = true;
    };
  }, [activeAreaId]);

  useEffect(() => {
    if (!restaurantId) return;

    // Skip polling when offline
    const isOfflineNow = typeof navigator !== "undefined" ? !navigator.onLine : false;
    if (isOfflineNow) return;

    let cancelled = false;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          // Skip if offline
          if (typeof navigator !== "undefined" && !navigator.onLine) return;
          if (cancelled) return;
          await reloadOpenOrders(restaurantId);
          if (cancelled) return;
          if (activeAreaId) await reloadActiveArea(activeAreaId);
        } catch {
          // ignore polling errors
        }
      })();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [restaurantId, activeAreaId]);

  const tables = useMemo(() => {
    const map = new Map<string, DineInTableOrder>();
    for (const o of orders) {
      const label = (o.customer_name ?? "").trim();
      if (!label) continue;
      if (!map.has(label)) map.set(label, o);
    }

    const rows: TableRow[] = [];
    for (let i = 1; i <= tableCount; i += 1) {
      const label = `Table ${i}`;
      rows.push({ tableNumber: i, openOrder: map.get(label) ?? null });
    }

    return rows;
  }, [orders, tableCount]);

  const openOrdersByNumber = useMemo(() => {
    const map = new Map<number, DineInTableOrder>();
    for (const o of orders) {
      const label = (o.customer_name ?? "").trim();
      if (!label) continue;
      const m = /^Table\s+(\d+)$/i.exec(label);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && !map.has(n)) map.set(n, o);
    }
    return map;
  }, [orders]);

  const resolvedTableStatus = useCallback(
    (tableNumber: number, openOrder: DineInTableOrder | null) => {
      const meta = tableMetaByNumber[tableNumber] ?? null;
      const local = (meta?.status ?? null) as TableLocalStatus | null;
      if (local === "needs_cleaning") return "needs_cleaning";
      if (openOrder) return "order_in_progress";
      if (local === "seated") return "seated";
      return "available";
    },
    [tableMetaByNumber],
  );

  const statusLabel = (s: TableLocalStatus) => {
    if (s === "available") return "Available";
    if (s === "seated") return "Seated";
    if (s === "needs_cleaning") return "Needs Cleaning";
    if (s === "served") return "Served";
    return "Order In Progress";
  };

  async function confirmTransfer() {
    if (!restaurantId) return;
    const fromTable = selectedTableNumber;
    const order = selectedOpenOrder;
    if (!fromTable || !order?.id) return;
    const to = Number(transferToTable);
    if (!Number.isFinite(to) || to <= 0 || to > 200) {
      setError("Enter a valid table number");
      return;
    }
    if (to === fromTable) {
      setError("Choose a different table");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Cannot transfer while offline");
      return;
    }

    setError(null);
    try {
      const nextLabel = `Table ${Math.floor(to)}`;
      const res = await supabase.from("orders").update({ customer_name: nextLabel }).eq("id", order.id);
      if (res.error) throw res.error;
      upsertTableMeta(restaurantId, fromTable, { status: "available", guests: null, server: null });
      upsertTableMeta(restaurantId, to, { status: "order_in_progress" });
      await reloadOpenOrders(restaurantId);
      setShowTransfer(false);
      setShowTableActions(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to transfer";
      setError(msg);
    }
  }

  function confirmSeatGuests() {
    if (!restaurantId) return;
    const n = selectedTableNumber;
    if (!n) return;
    const guests = Number(seatGuestsCount);
    const safeGuests = Number.isFinite(guests) ? Math.max(0, Math.min(99, Math.floor(guests))) : 0;
    const server = seatServerName.trim();

    upsertTableMeta(restaurantId, n, {
      status: safeGuests > 0 ? "seated" : "available",
      guests: safeGuests > 0 ? safeGuests : null,
      server: server ? server : null,
    });

    setShowSeatGuests(false);
  }

  function markNeedsCleaning() {
    if (!restaurantId) return;
    const n = selectedTableNumber;
    if (!n) return;
    upsertTableMeta(restaurantId, n, { status: "needs_cleaning" });
    setShowTableActions(false);
  }

  function clearNeedsCleaning() {
    if (!restaurantId) return;
    const n = selectedTableNumber;
    if (!n) return;
    upsertTableMeta(restaurantId, n, { status: "available", guests: null, server: null });
  }

  async function saveTableCount(next: number) {
    setError(null);
    const safe = Math.max(1, Math.min(200, Math.floor(next)));
    setTableCount(safe);
    try {
      window.localStorage.setItem(TABLE_COUNT_KEY, String(safe));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  const hasFloorPlan = areas.length > 0;
  const activeArea = activeAreaId ? areas.find((a) => a.id === activeAreaId) ?? null : null;

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Tables</h1>
            <p className="text-sm text-[var(--mp-muted)]">Tap a table to open its ticket.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/pos")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white"
            >
              Back to POS
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {hasFloorPlan ? (
          <div className="mt-8">
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
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
              </div>

              {activeArea ? (
                <div className="mt-6">
                  <div className="relative overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-[var(--mp-bg)]" style={{ height: 520 }}>
                    <div className="relative" style={{ width: activeArea.width, height: activeArea.height }}>
                      {floorObjects.map((o) => (
                        <div
                          key={o.id}
                          className="absolute rounded-xl border border-[var(--mp-border)] bg-white/90 px-3 py-2 text-xs font-semibold shadow-sm"
                          style={{ left: o.x, top: o.y, width: o.width, height: o.height }}
                          title={o.kind}
                        >
                          {o.kind === "door" ? "Door" : "Bar"}
                        </div>
                      ))}

                      {floorTables.map((t) => {
                        const open = openOrdersByNumber.get(t.table_number) ?? null;
                        const status = resolvedTableStatus(t.table_number, open);
                        const occupied = status === "order_in_progress";
                        const needsCleaning = status === "needs_cleaning";
                        const seated = status === "seated";
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => openTableActions(t.table_number, open)}
                            className={`absolute grid place-items-center border text-sm font-bold shadow-sm transition-colors ${
                              t.shape === "round" ? "rounded-full" : "rounded-2xl"
                            } ${
                              needsCleaning
                                ? "border-red-200 bg-red-50 hover:bg-red-100"
                                : occupied
                                  ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                  : seated
                                    ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                                    : "border-[var(--mp-border)] bg-white hover:bg-black/[0.03]"
                            }`}
                            style={{ left: t.x, top: t.y, width: t.width, height: t.height }}
                            title={`Table ${t.table_number}`}
                          >
                            {t.table_number}
                            <span className="mt-1 text-[10px] font-semibold text-[var(--mp-muted)]">{t.seats} seats</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-[var(--mp-muted)]">
                    Occupied tables are detected from open dine-in tickets.
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-sm text-[var(--mp-muted)]">No active area.</div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
                <h2 className="text-base font-semibold">Table count</h2>
                <p className="mt-2 text-sm text-[var(--mp-muted)]">Stored per device (no DB changes).</p>

                <div className="mt-4 flex gap-2">
                  <input
                    inputMode="numeric"
                    value={String(tableCount)}
                    onChange={(e) => void saveTableCount(Number(e.target.value))}
                    className="h-10 w-32 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
                <h2 className="text-base font-semibold">Status</h2>
                <p className="mt-2 text-sm text-[var(--mp-muted)]">Occupied tables are detected from open dine-in tickets.</p>

                <div className="mt-4 rounded-2xl border border-[var(--mp-border)] px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-[var(--mp-muted)]">Open tables</div>
                    <div className="font-semibold">{orders.length}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[var(--mp-muted)]">Active restaurant</div>
                    <div className="font-semibold">{restaurantId ? restaurantId.slice(0, 8) : "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tables.map((t) => {
                const occupied = !!t.openOrder;
                const status = resolvedTableStatus(t.tableNumber, t.openOrder);
                return (
                  <button
                    key={t.tableNumber}
                    onClick={() => openTableActions(t.tableNumber, t.openOrder)}
                    className={`rounded-2xl border p-5 text-left shadow-sm transition-colors ${
                      occupied
                        ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                        : "border-[var(--mp-border)] bg-white hover:bg-black/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold">Table {t.tableNumber}</div>
                      <div
                        className={`text-xs font-medium ${
                          status === "needs_cleaning"
                            ? "text-red-700"
                            : status === "seated"
                              ? "text-amber-800"
                              : occupied
                                ? "text-emerald-800"
                                : "text-[var(--mp-muted)]"
                        }`}
                      >
                        {statusLabel(status)}
                      </div>
                    </div>

                    {occupied ? (
                      <div className="mt-2 text-sm text-[var(--mp-fg)]">
                        {t.openOrder?.ticket_no != null ? `Ticket #${t.openOrder.ticket_no}` : "Open ticket"} • ${
                          Number(t.openOrder?.total ?? 0).toFixed(2)
                        }
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-[var(--mp-muted)]">Tap to open ticket</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showTableActions && selectedTableNumber ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Table Actions</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTableActions(false);
                  setShowSeatGuests(false);
                  setShowTransfer(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white text-sm font-semibold hover:bg-black/[0.03]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-bg)] p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-[var(--mp-muted)]">Table</div>
                <div className="font-semibold">{selectedTableNumber}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[var(--mp-muted)]">Status</div>
                <div className="font-semibold">{statusLabel(resolvedTableStatus(selectedTableNumber, selectedOpenOrder))}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[var(--mp-muted)]">Server</div>
                <div className="font-semibold">{(tableMetaByNumber[selectedTableNumber]?.server ?? "-") as string}</div>
              </div>
            </div>

            {showSeatGuests ? (
              <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Seat guests</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      inputMode="numeric"
                      value={seatGuestsCount}
                      onChange={(e) => setSeatGuestsCount(e.target.value)}
                      placeholder="Guests"
                      className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    />
                    <input
                      value={seatServerName}
                      onChange={(e) => setSeatServerName(e.target.value)}
                      placeholder="Server"
                      className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSeatGuests(false)}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={confirmSeatGuests}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {showTransfer ? (
              <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Transfer to table</label>
                  <input
                    inputMode="numeric"
                    value={transferToTable}
                    onChange={(e) => setTransferToTable(e.target.value)}
                    placeholder="Table #"
                    className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTransfer(false)}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmTransfer()}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                      disabled={!selectedOpenOrder}
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!showSeatGuests && !showTransfer ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearNeedsCleaning();
                    router.push(`/pos?table=${selectedTableNumber}`);
                    setShowTableActions(false);
                  }}
                  className="col-span-2 inline-flex h-11 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  + New Order
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSeatGuests(true);
                    const meta = tableMetaByNumber[selectedTableNumber] ?? null;
                    setSeatGuestsCount(meta?.guests != null ? String(meta.guests) : "");
                    setSeatServerName(meta?.server ?? "");
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                >
                  Seat Guests
                </button>

                <button
                  type="button"
                  onClick={() => {
                    router.push(`/pos?table=${selectedTableNumber}`);
                    setShowTableActions(false);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                >
                  View Check
                </button>

                <button
                  type="button"
                  onClick={() => setShowTransfer(true)}
                  disabled={!selectedOpenOrder}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-50"
                >
                  Transfer
                </button>

                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold opacity-50"
                >
                  Merge Checks
                </button>

                <button
                  type="button"
                  onClick={() => {
                    router.push(`/pos?table=${selectedTableNumber}&split=1`);
                    setShowTableActions(false);
                  }}
                  disabled={!selectedOpenOrder}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-50"
                >
                  Split Check
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const status = resolvedTableStatus(selectedTableNumber, selectedOpenOrder);
                    if (status === "needs_cleaning") {
                      clearNeedsCleaning();
                      setShowTableActions(false);
                      return;
                    }
                    markNeedsCleaning();
                  }}
                  className="col-span-2 inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {resolvedTableStatus(selectedTableNumber, selectedOpenOrder) === "needs_cleaning"
                    ? "Clear Needs Cleaning"
                    : "Mark as Needs Cleaning"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
