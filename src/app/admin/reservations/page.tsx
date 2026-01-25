"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getSetupContext } from "@/lib/setupData";

type Reservation = {
  id: string;
  restaurantId: string;
  createdAt: string;
  status: "active" | "canceled";
  name: string;
  phone: string;
  partySize: number;
  startAt: string;
  notes: string;
  tableNumber: number | null;
};

function storageKey(restaurantId: string) {
  return `pos.reservations.${restaurantId}`;
}

function loadReservations(restaurantId: string): Reservation[] {
  try {
    const raw = window.localStorage.getItem(storageKey(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Reservation[];
  } catch {
    return [];
  }
}

function saveReservations(restaurantId: string, reservations: Reservation[]) {
  window.localStorage.setItem(storageKey(restaurantId), JSON.stringify(reservations));
}

export default function AdminReservationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [rows, setRows] = useState<Reservation[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [startAt, setStartAt] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");

  const activeRows = useMemo(() => rows.filter((r) => r.status === "active"), [rows]);
  const canceledRows = useMemo(() => rows.filter((r) => r.status === "canceled"), [rows]);

  function refreshLocal(rid: string) {
    const next = loadReservations(rid);
    next.sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return a.startAt.localeCompare(b.startAt);
    });
    setRows(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      if (typeof window !== "undefined") {
        refreshLocal(rid);
      }

      setLoading(false);
    }

    void load();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!restaurantId) return;

    const party = Number(partySize);
    if (!Number.isFinite(party) || party <= 0 || party > 100) {
      setError("Party size must be a number between 1 and 100");
      return;
    }

    const start = startAt.trim();
    if (!start) {
      setError("Missing date/time");
      return;
    }

    const tnRaw = tableNumber.trim();
    const tnNumber = tnRaw ? Number(tnRaw) : NaN;
    if (tnRaw && (!Number.isFinite(tnNumber) || tnNumber <= 0 || tnNumber > 200)) {
      setError("Table number must be between 1 and 200");
      return;
    }

    const res: Reservation = {
      id: `res_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      restaurantId: restaurantId,
      createdAt: new Date().toISOString(),
      status: "active",
      name: name.trim(),
      phone: phone.trim(),
      partySize: party,
      startAt: start,
      notes: notes.trim(),
      tableNumber: tnRaw ? Math.floor(tnNumber) : null,
    };

    if (!res.name) {
      setError("Missing name");
      return;
    }

    const next = [res, ...rows];
    setRows(next);

    try {
      saveReservations(restaurantId, next);
    } catch {
      setError("Failed to save reservation (storage error)");
      return;
    }

    setName("");
    setPhone("");
    setPartySize("2");
    setStartAt("");
    setTableNumber("");
    setNotes("");
    setSuccess("Reservation created.");
  }

  async function cancelReservation(id: string) {
    if (!restaurantId) return;
    setError(null);
    setSuccess(null);

    const next = rows.map((r) => (r.id === id ? { ...r, status: "canceled" as const } : r));
    setRows(next);

    try {
      saveReservations(restaurantId, next);
    } catch {
      setError("Failed to save reservation (storage error)");
      return;
    }

    setSuccess("Reservation canceled.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage reservations for the active restaurant.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Create reservation</h2>

            <form onSubmit={onCreate} className="mt-4 grid gap-3">
              <input
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  inputMode="numeric"
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Party size"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                />

                <input
                  inputMode="numeric"
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Table (optional)"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>

              <input
                type="datetime-local"
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />

              <textarea
                className="min-h-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!name.trim() || !startAt.trim()}
              >
                Create
              </button>
            </form>

            <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              Stored on this device (local storage). We will move this to the database later.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Upcoming</h2>

            <div className="mt-4 flex flex-col gap-2">
              {activeRows.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">No reservations.</div>
              ) : (
                activeRows.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {r.phone ? `${r.phone} • ` : ""}
                          Party {r.partySize}
                          {r.tableNumber ? ` • Table ${r.tableNumber}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => void cancelReservation(r.id)}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{new Date(r.startAt).toLocaleString()}</div>

                    {r.notes ? (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.notes}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold">Canceled</h3>
              <div className="mt-3 flex flex-col gap-2">
                {canceledRows.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">No canceled reservations.</div>
                ) : (
                  canceledRows.slice(0, 10).map((r) => (
                    <div key={r.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                      <div className="font-medium">{r.name}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{new Date(r.startAt).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
