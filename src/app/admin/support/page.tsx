"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useMarketingLang } from "@/lib/useMarketingLang";

type SupportCaseStatus = "open" | "in_progress" | "closed";

type SupportCasePriority = "low" | "normal" | "high";

type SupportCaseRow = {
  id: string;
  restaurant_id: string;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  customer_name: string | null;
  customer_phone: string | null;
  subject: string;
  description: string | null;
  internal_notes: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminSupportPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    forbidden: isEs ? "Prohibido" : "Forbidden",
    title: isEs ? "Centro de soporte" : "Support Station",
    subtitle: isEs ? "Crea y da seguimiento a los casos de soporte." : "Create and track support cases.",
    back: isEs ? "← Volver" : "Back",
    whatsapp: "WhatsApp",
    newCase: isEs ? "Nuevo caso" : "New case",
    customerNameOptional: isEs ? "Nombre del cliente (opcional)" : "Customer name (optional)",
    customerPhoneOptional: isEs ? "Teléfono del cliente (opcional)" : "Customer phone (optional)",
    subject: isEs ? "Asunto" : "Subject",
    descriptionOptional: isEs ? "Descripción (opcional)" : "Description (optional)",
    priorityLow: isEs ? "Baja" : "Low",
    priorityNormal: isEs ? "Normal" : "Normal",
    priorityHigh: isEs ? "Alta" : "High",
    createCase: isEs ? "Crear caso" : "Create case",
    refresh: isEs ? "Actualizar" : "Refresh",
    cases: isEs ? "Casos" : "Cases",
    searchCases: isEs ? "Buscar casos" : "Search cases",
    noCases: isEs ? "Sin casos." : "No cases.",
    noName: isEs ? "(sin nombre)" : "(no name)",
    statusOpen: isEs ? "Abierto" : "Open",
    statusInProgress: isEs ? "En progreso" : "In progress",
    statusClosed: isEs ? "Cerrado" : "Closed",
    internalNotes: isEs ? "Notas internas" : "Internal notes",
    resolution: isEs ? "Resolución" : "Resolution",
    notSignedIn: isEs ? "No has iniciado sesión" : "Not signed in",
    failedPermissions: isEs ? "No se pudieron verificar permisos" : "Failed to check permissions",
    failedLoadCases: isEs ? "No se pudieron cargar los casos" : "Failed to load cases",
    subjectRequired: isEs ? "El asunto es obligatorio" : "Subject is required",
    failedCreateCase: isEs ? "No se pudo crear el caso" : "Failed to create case",
    caseCreated: isEs ? "Caso creado." : "Case created.",
    failedUpdateCase: isEs ? "No se pudo actualizar el caso" : "Failed to update case",
    updated: isEs ? "Actualizado." : "Updated.",
    delete: isEs ? "Eliminar" : "Delete",
    deleteClosed: isEs ? "Eliminar cerrado" : "Delete closed",
    confirmDelete: isEs ? "¿Eliminar este caso?" : "Delete this case?",
    failedDelete: isEs ? "No se pudo eliminar el caso" : "Failed to delete case",
    failedLoad: isEs ? "No se pudo cargar" : "Failed to load",
    waTitle: isEs ? "Soporte IslaPOS" : "IslaPOS Support",
    waRestaurant: isEs ? "Restaurante" : "Restaurant",
    waCaseId: isEs ? "ID de caso" : "Case ID",
    waSubject: isEs ? "Asunto" : "Subject",
    waCustomer: isEs ? "Cliente" : "Customer",
    waPhone: isEs ? "Teléfono" : "Phone",
    waDetails: isEs ? "Detalles" : "Details",
    aiTitle: isEs ? "Asistente de soporte" : "Support Assistant",
    aiSubtitle: isEs ? "Describe tu problema y te daré pasos rápidos." : "Describe your issue and I’ll suggest next steps.",
    aiPlaceholder: isEs ? "Escribe tu problema (ej. impresora no imprime)" : "Describe your issue (e.g., printer not printing)",
    aiSend: isEs ? "Enviar" : "Send",
    aiNoAnswer: isEs
      ? "No encontré una guía exacta. Puedo crear un caso para soporte."
      : "I couldn’t find an exact guide. I can create a support case.",
    aiCreateCase: isEs ? "Crear caso desde el chat" : "Create case from chat",
    aiSuggested: isEs ? "Sugerencia" : "Suggestion",
    aiUser: isEs ? "Tú" : "You",
    aiAssistant: isEs ? "Asistente" : "Assistant",
  };

  const faq = [
    {
      id: "printer",
      keywords: ["printer", "imprimir", "print", "impresora", "receipt", "ticket", "hub"],
      title: { en: "Printer not printing", es: "La impresora no imprime" },
      answer: {
        en: "Check power, USB/network, then open the Windows Print Hub and confirm it shows as connected. Reprint from POS.",
        es: "Revisa energía, USB/red, luego abre Windows Print Hub y confirma conexión. Reimprime desde POS.",
      },
    },
    {
      id: "login",
      keywords: ["login", "sign in", "password", "contraseña", "ingresar", "session"],
      title: { en: "Login issues", es: "Problemas de inicio de sesión" },
      answer: {
        en: "Verify email/password, reset password if needed, and check if your role has access.",
        es: "Verifica email/contraseña, restablece si es necesario y confirma que tu rol tiene acceso.",
      },
    },
    {
      id: "menu",
      keywords: ["menu", "category", "product", "producto", "categoría", "modifier", "modificador"],
      title: { en: "Menu setup", es: "Configuración del menú" },
      answer: {
        en: "Go to Admin → Menu. Create categories, then add products and assign modifiers.",
        es: "Ve a Admin → Menú. Crea categorías, luego agrega productos y asigna modificadores.",
      },
    },
    {
      id: "kds",
      keywords: ["kds", "kitchen", "cocina", "display", "pantalla"],
      title: { en: "KDS not updating", es: "KDS no actualiza" },
      answer: {
        en: "Confirm KDS link is active and refresh the KDS screen. Orders update every few seconds.",
        es: "Confirma que el link KDS está activo y refresca la pantalla. Las órdenes actualizan cada pocos segundos.",
      },
    },
    {
      id: "offline",
      keywords: ["offline", "sin internet", "hurricane", "modo", "sync", "sincronizar"],
      title: { en: "Offline mode", es: "Modo offline" },
      answer: {
        en: "Use POS → Offline to sync tickets when connection returns.",
        es: "Usa POS → Offline para sincronizar tickets cuando vuelva la conexión.",
      },
    },
  ];

  type ChatMsg = { role: "user" | "assistant"; text: string };
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [canAccessSupport, setCanAccessSupport] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [rows, setRows] = useState<SupportCaseRow[]>([]);
  const [search, setSearch] = useState("");

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<SupportCasePriority>("normal");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const parts = [
        r.id,
        r.subject,
        r.customer_name ?? "",
        r.customer_phone ?? "",
        r.status,
        r.priority,
        r.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return parts.includes(q);
    });
  }, [rows, search]);

  const whatsappNumber = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").trim();
  const whatsappDigits = whatsappNumber.replace(/\D/g, "");

  const waText = useMemo(() => {
    const mostRecent = rows[0] ?? null;
    const lines: string[] = [];
    lines.push(t.waTitle);
    if (restaurantId) lines.push(`${t.waRestaurant}: ${restaurantId}`);
    if (mostRecent) {
      lines.push(`${t.waCaseId}: ${mostRecent.id}`);
      lines.push(`${t.waSubject}: ${mostRecent.subject}`);
      if (mostRecent.customer_name) lines.push(`${t.waCustomer}: ${mostRecent.customer_name}`);
      if (mostRecent.customer_phone) lines.push(`${t.waPhone}: ${mostRecent.customer_phone}`);
    } else {
      const subject = newSubject.trim();
      const customer = newCustomerName.trim();
      const phone = newCustomerPhone.trim();
      const desc = newDescription.trim();
      if (subject) lines.push(`${t.waSubject}: ${subject}`);
      if (customer) lines.push(`${t.waCustomer}: ${customer}`);
      if (phone) lines.push(`${t.waPhone}: ${phone}`);
      if (desc) lines.push(`${t.waDetails}: ${desc}`);
    }
    return lines.join("\n");
  }, [newCustomerName, newCustomerPhone, newDescription, newSubject, restaurantId, rows, t]);

  const waHref = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(waText)}` : "https://wa.me/";

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

  async function checkSupportAccess() {
    const res = await authedFetch("/api/admin/support-access");
    const json = (await res.json().catch(() => null)) as
      | { canAccessSupport?: boolean; restaurantId?: string; error?: string }
      | null;
    if (!res.ok || json?.error) throw new Error(json?.error ?? t.failedPermissions);
    return { ok: !!json?.canAccessSupport, restaurantId: typeof json?.restaurantId === "string" ? json.restaurantId : null };
  }

  async function loadCases() {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/support-cases");
    const json = (await res.json().catch(() => null)) as { cases?: SupportCaseRow[]; error?: string } | null;

    if (!res.ok || json?.error) {
      throw new Error(json?.error ?? t.failedLoadCases);
    }

    setRows(json?.cases ?? []);
  }

  async function createCaseWith(subject: string, description: string) {
    setError(null);
    setSuccess(null);

    const subjectValue = subject.trim();
    if (!subjectValue) {
      setError(t.subjectRequired);
      return;
    }

    const res = await authedFetch("/api/admin/support-cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: newCustomerName.trim() ? newCustomerName.trim() : null,
        customerPhone: newCustomerPhone.trim() ? newCustomerPhone.trim() : null,
        subject: subjectValue,
        description: description.trim() ? description.trim() : null,
        priority: newPriority,
      }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedCreateCase);
      return;
    }

    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewSubject("");
    setNewDescription("");
    setNewPriority("normal");

    await loadCases();
    setSuccess(t.caseCreated);
  }

  async function createCase() {
    return createCaseWith(newSubject, newDescription);
  }

  function respondWithFaq(message: string) {
    const text = message.toLowerCase();
    let best: { score: number; item: (typeof faq)[number] | null } = { score: 0, item: null };
    for (const item of faq) {
      const score = item.keywords.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);
      if (score > best.score) best = { score, item };
    }
    if (!best.item || best.score === 0) {
      return t.aiNoAnswer;
    }
    return `${t.aiSuggested}: ${isEs ? best.item.title.es : best.item.title.en}\n${isEs ? best.item.answer.es : best.item.answer.en}`;
  }

  function onAiSend() {
    const msg = aiInput.trim();
    if (!msg) return;
    setAiMessages((prev) => [...prev, { role: "user", text: msg }, { role: "assistant", text: respondWithFaq(msg) }]);
    setAiInput("");
  }

  async function onAiCreateCase() {
    const lastUser = [...aiMessages].reverse().find((m) => m.role === "user")?.text ?? "";
    const lastAssistant = [...aiMessages].reverse().find((m) => m.role === "assistant")?.text ?? "";
    const subject = lastUser || (isEs ? "Soporte" : "Support");
    const description = `${lastUser}\n\n${lastAssistant}`.trim();
    await createCaseWith(subject, description);
  }
  async function updateCase(id: string, patch: Partial<SupportCaseRow> & { internal_notes?: string | null }) {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/support-cases", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        status: (patch.status as SupportCaseStatus | undefined) ?? undefined,
        priority: (patch.priority as SupportCasePriority | undefined) ?? undefined,
        subject: typeof patch.subject === "string" ? patch.subject : undefined,
        description: typeof patch.description === "string" ? patch.description : undefined,
        customerName: typeof patch.customer_name === "string" ? patch.customer_name : undefined,
        customerPhone: typeof patch.customer_phone === "string" ? patch.customer_phone : undefined,
        internalNotes: typeof patch.internal_notes === "string" ? patch.internal_notes : undefined,
        resolution: typeof patch.resolution === "string" ? patch.resolution : undefined,
      }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedUpdateCase);
      return;
    }

    await loadCases();
    setSuccess(t.updated);
  }

  async function deleteCase(id: string) {
    setError(null);
    setSuccess(null);

    const confirmed = window.confirm(t.confirmDelete);
    if (!confirmed) return;

    const res = await authedFetch("/api/admin/support-cases", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? t.failedDelete);
      return;
    }

    await loadCases();
    setSuccess(t.updated);
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

      try {
        const access = await checkSupportAccess();
        if (cancelled) return;
        setCanAccessSupport(access.ok);
        setRestaurantId(access.restaurantId);
        if (!access.ok) {
          setError(t.forbidden);
          setLoading(false);
          return;
        }

        await loadCases();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.failedLoad;
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

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">{t.loading}</div>
      </div>
    );
  }

  if (!canAccessSupport) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">{error ?? t.forbidden}</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-[var(--mp-muted)]">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              {t.whatsapp}
            </a>
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              {t.back}
            </button>
          </div>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null} */}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm lg:col-span-1">
            <div className="text-base font-semibold">{t.newCase}</div>
            <div className="mt-4 grid gap-3">
              <input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder={t.customerNameOptional}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder={t.customerPhoneOptional}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t.subject}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t.descriptionOptional}
                className="min-h-28 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as SupportCasePriority)}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              >
                <option value="low">{t.priorityLow}</option>
                <option value="normal">{t.priorityNormal}</option>
                <option value="high">{t.priorityHigh}</option>
              </select>
              <button
                onClick={() => void createCase()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                {t.createCase}
              </button>
              <button
                onClick={() => void loadCases()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50"
              >
                {t.refresh}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-4">
              <div className="text-sm font-semibold">{t.aiTitle}</div>
              <div className="mt-1 text-xs text-[var(--mp-muted)]">{t.aiSubtitle}</div>

              <div className="mt-3 grid gap-2">
                <div className="max-h-52 overflow-auto rounded-xl border border-[var(--mp-border)] bg-[#fffdf7] p-3 text-sm">
                  {aiMessages.length === 0 ? (
                    <div className="text-[var(--mp-muted)]">{t.aiNoAnswer}</div>
                  ) : (
                    aiMessages.map((m, i) => (
                      <div key={`${m.role}-${i}`} className="mb-2">
                        <div className="text-xs font-semibold text-[var(--mp-muted)]">
                          {m.role === "user" ? t.aiUser : t.aiAssistant}
                        </div>
                        <div className="whitespace-pre-line">{m.text}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={t.aiPlaceholder}
                    className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  />
                  <button
                    type="button"
                    onClick={onAiSend}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                  >
                    {t.aiSend}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void onAiCreateCase()}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-zinc-50"
                >
                  {t.aiCreateCase}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">{t.cases}</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchCases}
                className="h-11 w-72 max-w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
            </div>

            <div className="mt-4 grid gap-3">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  {t.noCases}
                </div>
              ) : (
                filtered.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">{c.subject}</div>
                        <div className="text-xs text-[var(--mp-muted)]">
                          {c.customer_name ? c.customer_name : t.noName}
                          {c.customer_phone ? ` • ${c.customer_phone}` : ""}
                          {` • ${new Date(c.created_at).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={c.status}
                          onChange={(e) => void updateCase(c.id, { status: e.target.value as SupportCaseStatus })}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold"
                        >
                          <option value="open">{t.statusOpen}</option>
                          <option value="in_progress">{t.statusInProgress}</option>
                          <option value="closed">{t.statusClosed}</option>
                        </select>
                        <select
                          value={c.priority}
                          onChange={(e) => void updateCase(c.id, { priority: e.target.value as SupportCasePriority })}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold"
                        >
                          <option value="low">{t.priorityLow}</option>
                          <option value="normal">{t.priorityNormal}</option>
                          <option value="high">{t.priorityHigh}</option>
                        </select>
                      </div>
                    </div>

                    {c.description ? (
                      <div className="mt-3 text-sm text-[var(--mp-fg)]">{c.description}</div>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <textarea
                        defaultValue={c.internal_notes ?? ""}
                        placeholder={t.internalNotes}
                        onBlur={(e) => {
                          const next = e.target.value;
                          if ((c.internal_notes ?? "") === next) return;
                          void updateCase(c.id, { internal_notes: next });
                        }}
                        className="min-h-24 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
                      <textarea
                        defaultValue={c.resolution ?? ""}
                        placeholder={t.resolution}
                        onBlur={(e) => {
                          const next = e.target.value;
                          if ((c.resolution ?? "") === next) return;
                          void updateCase(c.id, { resolution: next });
                        }}
                        className="min-h-24 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void deleteCase(c.id)}
                        disabled={c.status !== "closed"}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {t.deleteClosed}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
