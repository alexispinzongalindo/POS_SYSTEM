"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useMarketingLang } from "@/lib/useMarketingLang";

type StaffRole = "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security";

type StaffRow = {
  id: string;
  email: string | null;
  role: StaffRole;
  name: string | null;
  pin: string | null;
};

export default function AdminStaffPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Personal" : "Staff",
    subtitle: isEs ? "Administra el acceso del personal del restaurante activo." : "Manage staff access for the active restaurant.",
    back: isEs ? "Volver" : "Back",
    staffList: isEs ? "Lista de personal" : "Staff list",
    staffHint: isEs ? "Invita usuarios nuevos desde Admin." : "Invite new users from the Admin home page.",
    search: isEs ? "Buscar por email" : "Search by email",
    refresh: isEs ? "Refrescar" : "Refresh",
    noneFound: isEs ? "No se encontró personal para este restaurante." : "No staff found for this restaurant.",
    noEmail: isEs ? "(sin email)" : "(no email)",
    name: isEs ? "Nombre" : "Name",
    pin: isEs ? "PIN" : "PIN",
    removeAccess: isEs ? "Quitar acceso" : "Remove access",
    roleCashier: isEs ? "Cajero (solo POS)" : "Cashier (POS only)",
    roleKitchen: isEs ? "Cocina (solo POS)" : "Kitchen (POS only)",
    roleMaintenance: isEs ? "Mantenimiento (solo POS)" : "Maintenance (POS only)",
    roleDriver: isEs ? "Driver (solo POS)" : "Driver (POS only)",
    roleSecurity: isEs ? "Seguridad (solo POS)" : "Security (POS only)",
    roleManager: isEs ? "Gerente (Admin + POS)" : "Manager (Admin + POS)",
    notSignedIn: isEs ? "No has iniciado sesión" : "Not signed in",
    loadFailed: isEs ? "No se pudo cargar el personal" : "Failed to load staff",
    updateRoleFailed: isEs ? "No se pudo actualizar el rol" : "Failed to update role",
    roleUpdated: isEs ? "Rol actualizado." : "Role updated.",
    updateFailed: isEs ? "No se pudo actualizar el personal" : "Failed to update staff",
    updated: isEs ? "Actualizado." : "Updated.",
    removeFailed: isEs ? "No se pudo quitar el acceso" : "Failed to remove access",
    removed: isEs ? "Acceso removido." : "Access removed.",
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const email = (r.email ?? "").toLowerCase();
      const name = (r.name ?? "").toLowerCase();
      const pin = (r.pin ?? "").toLowerCase();
      return email.includes(q) || name.includes(q) || pin.includes(q);
    });
  }, [rows, search]);

  async function authedFetch(path: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.replace("/login");
      throw new Error(t.notSignedIn);
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
      throw new Error(json?.error ?? t.loadFailed);
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
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
        router.replace("/pos");
        return;
      }

      try {
        await loadStaff();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.loadFailed;
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
      setError(json?.error ?? t.updateRoleFailed);
      return;
    }

    await loadStaff();
    setSuccess(t.roleUpdated);
  }

  async function updateStaff(userId: string, patch: { name?: string | null; pin?: string | null }) {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });

    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!res.ok || json?.error) {
      setError(json?.error ?? t.updateFailed);
      return;
    }

    await loadStaff();
    setSuccess(t.updated);
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
      setError(json?.error ?? t.removeFailed);
      return;
    }

    await loadStaff();
    setSuccess(t.removed);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            {t.back}
          </button>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null} */}

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">{t.staffList}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.staffHint}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => void loadStaff()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                {t.refresh}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {filteredRows.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.noneFound}</div>
            ) : (
              filteredRows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                >
                  <div>
                    <div className="text-sm font-medium">{r.name?.trim() ? r.name : r.email ?? t.noEmail}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.email ?? t.noEmail}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.id}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                      placeholder={t.name}
                      value={r.name ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: v } : x)));
                      }}
                      onBlur={() => void updateStaff(r.id, { name: (r.name ?? "").trim() ? (r.name ?? "").trim() : null })}
                    />

                    <input
                      className="h-9 w-24 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                      placeholder={t.pin}
                      inputMode="numeric"
                      value={r.pin ?? ""}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, pin: digitsOnly } : x)));
                      }}
                      onBlur={() => void updateStaff(r.id, { pin: (r.pin ?? "").trim() ? (r.pin ?? "").trim() : null })}
                    />

                    <select
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                      value={r.role}
                      onChange={(e) => void setRole(r.id, e.target.value as StaffRole)}
                    >
                      <option value="cashier">{t.roleCashier}</option>
                      <option value="kitchen">{t.roleKitchen}</option>
                      <option value="maintenance">{t.roleMaintenance}</option>
                      <option value="driver">{t.roleDriver}</option>
                      <option value="security">{t.roleSecurity}</option>
                      <option value="manager">{t.roleManager}</option>
                    </select>

                    <button
                      onClick={() => void removeAccess(r.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-black dark:text-red-200 dark:hover:bg-red-950/30"
                    >
                      {t.removeAccess}
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
