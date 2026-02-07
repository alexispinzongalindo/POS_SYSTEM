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

type ScheduleShift = {
  id: string;
  restaurant_id: string;
  staff_user_id: string;
  staff_pin: string | null;
  staff_label: string | null;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  created_at: string;
};

type DifferentialRow = {
  staffUserId: string | null;
  staffPin: string | null;
  staffLabel: string | null;
  scheduledMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLocalDateInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesToHM(totalMinutes: number) {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m}m`;
}

export default function AdminPayrollPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Nómina" : "Payroll",
    subtitle: isEs ? "Horarios, correo y programado vs real." : "Schedules, email, and scheduled vs actual.",
    back: isEs ? "← Volver" : "Back",
    scheduleTab: isEs ? "Horario" : "Schedule",
    reportTab: isEs ? "Reporte de diferencias" : "Differential report",
    weekStarting: isEs ? "Semana inicia" : "Week starting",
    createShiftTitle: isEs ? "Crear turno" : "Create shift",
    selectStaff: isEs ? "Selecciona personal" : "Select staff",
    noName: isEs ? "(sin nombre)" : "(no name)",
    pinLabel: (pin: string) => (isEs ? `(PIN ${pin})` : `(PIN ${pin})`),
    breakMinutesPlaceholder: isEs ? "Minutos de descanso" : "Break minutes",
    addShift: isEs ? "Agregar turno" : "Add shift",
    emailSchedulesTitle: isEs ? "Enviar horarios" : "Email schedules",
    emailSchedulesSubtitle: isEs ? "Enviar la semana seleccionada a cada empleado." : "Send the selected week to each staff member.",
    noStaff: isEs ? "No hay personal." : "No staff found.",
    noEmail: isEs ? "(sin correo)" : "(no email)",
    sendEmail: isEs ? "Enviar correo" : "Send email",
    shiftsTitle: isEs ? "Turnos" : "Shifts",
    shiftsSubtitle: isEs ? "Vista semanal de turnos programados." : "Week view of scheduled shifts.",
    refresh: isEs ? "Actualizar" : "Refresh",
    noShifts: isEs ? "No hay turnos en este rango." : "No shifts in this range.",
    breakLabel: (mins: number) => (isEs ? ` · Descanso ${mins}m` : ` · Break ${mins}m`),
    delete: isEs ? "Eliminar" : "Delete",
    scheduledVsActualTitle: isEs ? "Programado vs real" : "Scheduled vs actual",
    varianceSubtitle: isEs ? "La variación es real menos programado." : "Variance is actual minus scheduled.",
    loadingReport: isEs ? "Cargando reporte..." : "Loading report...",
    noData: isEs ? "No hay datos para este rango." : "No data for this range.",
    staffFallback: isEs ? "(personal)" : "(staff)",
    scheduledLabel: isEs ? "Programado" : "Scheduled",
    actualLabel: isEs ? "Real" : "Actual",
    varianceLabel: isEs ? "Variación" : "Variance",
    selectStaffError: isEs ? "Selecciona un empleado" : "Select a staff member",
    breakMinutesError: isEs ? "Los minutos de descanso deben ser un número" : "Break minutes must be a number",
    invalidStart: isEs ? "Hora de inicio inválida" : "Invalid start time",
    invalidEnd: isEs ? "Hora de fin inválida" : "Invalid end time",
    endAfterStart: isEs ? "La hora de fin debe ser después de la hora de inicio" : "End time must be after start time",
    failedCreateShift: isEs ? "No se pudo crear el turno" : "Failed to create shift",
    shiftCreated: isEs ? "Turno creado." : "Shift created.",
    failedDeleteShift: isEs ? "No se pudo eliminar el turno" : "Failed to delete shift",
    shiftDeleted: isEs ? "Turno eliminado." : "Shift deleted.",
    failedSendEmail: isEs ? "No se pudo enviar el correo" : "Failed to send email",
    emailSent: isEs ? "Correo enviado." : "Email sent.",
    failedLoadReport: isEs ? "No se pudo cargar el reporte" : "Failed to load report",
    failedLoadSchedules: isEs ? "No se pudieron cargar los horarios" : "Failed to load schedules",
    failedLoadStaff: isEs ? "No se pudo cargar el personal" : "Failed to load staff",
    failedLoadPayroll: isEs ? "No se pudo cargar la nómina" : "Failed to load payroll",
    notSignedIn: isEs ? "No has iniciado sesión" : "Not signed in",
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);

  const [mode, setMode] = useState<"schedule" | "report">("schedule");

  const [weekStart, setWeekStart] = useState(() => formatLocalDateInput(startOfWeekMonday(new Date())));

  const [newStaffId, setNewStaffId] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(() => formatLocalDateInput(new Date()));
  const [newStartTime, setNewStartTime] = useState<string>("09:00");
  const [newEndTime, setNewEndTime] = useState<string>("17:00");
  const [newBreakMinutes, setNewBreakMinutes] = useState<string>("0");

  const [reportRows, setReportRows] = useState<DifferentialRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const weekRange = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = addDays(start, 7);
    return { start, end };
  }, [weekStart]);

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
    const res = await authedFetch("/api/admin/staff");
    const json = (await res.json().catch(() => null)) as { staff?: StaffRow[]; error?: string } | null;
    if (!res.ok || json?.error) throw new Error(json?.error ?? t.failedLoadStaff);
    setStaff(json?.staff ?? []);
  }

  async function loadShifts() {
    const start = weekRange.start.toISOString();
    const end = weekRange.end.toISOString();
    const res = await authedFetch(`/api/admin/payroll/schedules?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    const json = (await res.json().catch(() => null)) as { shifts?: ScheduleShift[]; error?: string } | null;
    if (!res.ok || json?.error) throw new Error(json?.error ?? t.failedLoadSchedules);
    setShifts(Array.isArray(json?.shifts) ? json?.shifts ?? [] : []);
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
        await loadShifts();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.failedLoadPayroll;
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
  }, [router, weekRange.end, weekRange.start]);

  useEffect(() => {
    if (loading) return;
    void (async () => {
      try {
        await loadShifts();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.failedLoadSchedules;
        setError(msg);
      }
    })();
  }, [loading, weekRange.end, weekRange.start]);

  const staffById = useMemo(() => {
    const m = new Map<string, StaffRow>();
    for (const s of staff) m.set(s.id, s);
    return m;
  }, [staff]);

  const shiftsSorted = useMemo(() => {
    const copy = [...shifts];
    copy.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return copy;
  }, [shifts]);

  async function createShift() {
    setError(null);
    setSuccess(null);

    const staffRow = staffById.get(newStaffId) ?? null;
    if (!staffRow) {
      setError(t.selectStaffError);
      return;
    }

    const breakMinutesNum = Number(newBreakMinutes || "0");
    if (!Number.isFinite(breakMinutesNum) || breakMinutesNum < 0 || breakMinutesNum > 480) {
      setError(t.breakMinutesError);
      return;
    }

    const startLocal = new Date(`${newDate}T${newStartTime}:00`);
    const endLocal = new Date(`${newDate}T${newEndTime}:00`);
    if (!(startLocal instanceof Date) || Number.isNaN(startLocal.valueOf())) {
      setError(t.invalidStart);
      return;
    }
    if (!(endLocal instanceof Date) || Number.isNaN(endLocal.valueOf())) {
      setError(t.invalidEnd);
      return;
    }

    if (endLocal <= startLocal) {
      setError(t.endAfterStart);
      return;
    }

    const res = await authedFetch("/api/admin/payroll/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        staffUserId: staffRow.id,
        staffPin: staffRow.pin,
        staffLabel: staffRow.name ?? staffRow.email,
        startsAt: startLocal.toISOString(),
        endsAt: endLocal.toISOString(),
        breakMinutes: breakMinutesNum,
      }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedCreateShift);
      return;
    }

    setSuccess(t.shiftCreated);
    await loadShifts();
  }

  async function deleteShift(id: string) {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/payroll/schedules", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedDeleteShift);
      return;
    }

    setSuccess(t.shiftDeleted);
    await loadShifts();
  }

  async function sendScheduleEmail(staffUserId: string) {
    setError(null);
    setSuccess(null);

    const start = weekRange.start.toISOString();
    const end = weekRange.end.toISOString();

    const res = await authedFetch("/api/admin/payroll/email-schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffUserId, start, end }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedSendEmail);
      return;
    }

    setSuccess(t.emailSent);
  }

  async function loadDifferentialReport() {
    setError(null);
    setSuccess(null);
    setReportLoading(true);

    try {
      const start = weekRange.start.toISOString();
      const end = weekRange.end.toISOString();
      const res = await authedFetch(`/api/admin/payroll/report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const json = (await res.json().catch(() => null)) as { rows?: DifferentialRow[]; error?: string } | null;
      if (!res.ok || json?.error) throw new Error(json?.error ?? t.failedLoadReport);
      setReportRows(Array.isArray(json?.rows) ? (json?.rows ?? []) : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.failedLoadReport;
      setError(msg);
      setReportRows([]);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && mode === "report") {
      void loadDifferentialReport();
    }
  }, [loading, mode, weekRange.end, weekRange.start]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            {t.back}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("schedule")}
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium ${
                mode === "schedule"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              }`}
            >
              {t.scheduleTab}
            </button>
            <button
              type="button"
              onClick={() => setMode("report")}
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium ${
                mode === "report"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              }`}
            >
              {t.reportTab}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.weekStarting}</div>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
            />
          </div>
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

        {mode === "schedule" ? (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-base font-semibold">{t.createShiftTitle}</h2>
                <div className="mt-4 grid gap-3">
                  <select
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  >
                    <option value="">{t.selectStaff}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.name ?? s.email ?? t.noName) + (s.pin ? ` ${t.pinLabel(s.pin)}` : "")}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                    />
                    <input
                      type="number"
                      min={0}
                      max={480}
                      value={newBreakMinutes}
                      onChange={(e) => setNewBreakMinutes(e.target.value)}
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                      placeholder={t.breakMinutesPlaceholder}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                    />
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void createShift()}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {t.addShift}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-base font-semibold">{t.emailSchedulesTitle}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.emailSchedulesSubtitle}</p>

                <div className="mt-4 flex flex-col gap-2">
                  {staff.length === 0 ? (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.noStaff}</div>
                  ) : (
                    staff.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                      >
                        <div>
                          <div className="text-sm font-medium">{s.name?.trim() ? s.name : s.email ?? t.noEmail}</div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">{s.email ?? t.noEmail}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void sendScheduleEmail(s.id)}
                          disabled={!s.email}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                        >
                          {t.sendEmail}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{t.shiftsTitle}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.shiftsSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadShifts()}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                >
                  {t.refresh}
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {shiftsSorted.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.noShifts}</div>
                ) : (
                  shiftsSorted.map((sh) => {
                    const label = sh.staff_label?.trim()
                      ? sh.staff_label
                      : sh.staff_pin
                        ? `PIN ${sh.staff_pin}`
                        : t.staffFallback;
                    const start = new Date(sh.starts_at);
                    const end = new Date(sh.ends_at);
                    return (
                      <div
                        key={sh.id}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                      >
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {start.toLocaleString()} → {end.toLocaleString()} {sh.break_minutes ? t.breakLabel(sh.break_minutes) : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteShift(sh.id)}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-black dark:text-red-200 dark:hover:bg-red-950/30"
                        >
                          {t.delete}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{t.scheduledVsActualTitle}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.varianceSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDifferentialReport()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                {t.refresh}
              </button>
            </div>

            {reportLoading ? (
              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{t.loadingReport}</div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {reportRows.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.noData}</div>
                ) : (
                  reportRows.map((r) => (
                    <div
                      key={`${r.staffUserId ?? "x"}:${r.staffPin ?? "x"}`}
                      className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="text-sm font-medium">
                        {r.staffLabel?.trim() ? r.staffLabel : r.staffPin ? `PIN ${r.staffPin}` : t.staffFallback}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {t.scheduledLabel}: {minutesToHM(r.scheduledMinutes)} · {t.actualLabel}: {minutesToHM(r.actualMinutes)} ·{" "}
                        {t.varianceLabel}: {minutesToHM(r.varianceMinutes)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
