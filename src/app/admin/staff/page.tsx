"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type StaffRole = "manager" | "cashier";

type StaffRow = {
  id: string;
  email: string | null;
  role: StaffRole;
};

export default function AdminStaffPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.email ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  async function authedFetch(path: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.replace("/login");
      throw new Error("Not signed in");
    }

    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        authorization: `Bearer ${token}`,
      },
    });
  }

  async function loadStaff() {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/staff");
    const json = (await res.json().catch(() => null)) as
      | { staff?: StaffRow[]; error?: string }
      | null;

    if (!res.ok || json?.error) {
      throw new Error(json?.error ?? "Failed to load staff");
    }

    setRows(json?.staff ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const role = (data.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      try {
        await loadStaff();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load staff";
        setError(msg);
      } finally {
        setLoading(false);
      }
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

  async function setRole(userId: string, role: StaffRole) {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });

    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!res.ok || json?.error) {
      setError(json?.error ?? "Failed to update role");
      return;
    }

    await loadStaff();
    setSuccess("Role updated.");
  }

  async function removeAccess(userId: string) {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/staff", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!res.ok || json?.error) {
      setError(json?.error ?? "Failed to remove access");
      return;
    }

    await loadStaff();
    setSuccess("Access removed.");
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
            <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage staff access for the active restaurant.
            </p>
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

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Staff list</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Invite new users from the Admin home page.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="Search by email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => void loadStaff()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {filteredRows.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">No staff found for this restaurant.</div>
            ) : (
              filteredRows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                >
                  <div>
                    <div className="text-sm font-medium">{r.email ?? "(no email)"}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.id}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                      value={r.role}
                      onChange={(e) => void setRole(r.id, e.target.value as StaffRole)}
                    >
                      <option value="cashier">Cashier (POS only)</option>
                      <option value="manager">Manager (Admin + POS)</option>
                    </select>

                    <button
                      onClick={() => void removeAccess(r.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-black dark:text-red-200 dark:hover:bg-red-950/30"
                    >
                      Remove access
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
