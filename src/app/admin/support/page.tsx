"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

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

  async function checkSupportAccess() {
    const res = await authedFetch("/api/admin/support-access");
    const json = (await res.json().catch(() => null)) as
      | { canAccessSupport?: boolean; restaurantId?: string; error?: string }
      | null;
    if (!res.ok || json?.error) throw new Error(json?.error ?? "Failed to check permissions");
    return { ok: !!json?.canAccessSupport, restaurantId: typeof json?.restaurantId === "string" ? json.restaurantId : null };
  }

  async function loadCases() {
    setError(null);
    setSuccess(null);

    const res = await authedFetch("/api/admin/support-cases");
    const json = (await res.json().catch(() => null)) as { cases?: SupportCaseRow[]; error?: string } | null;

    if (!res.ok || json?.error) {
      throw new Error(json?.error ?? "Failed to load cases");
    }

    setRows(json?.cases ?? []);
  }

  async function createCase() {
    setError(null);
    setSuccess(null);

    const subject = newSubject.trim();
    if (!subject) {
      setError("Subject is required");
      return;
    }

    const res = await authedFetch("/api/admin/support-cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: newCustomerName.trim() ? newCustomerName.trim() : null,
        customerPhone: newCustomerPhone.trim() ? newCustomerPhone.trim() : null,
        subject,
        description: newDescription.trim() ? newDescription.trim() : null,
        priority: newPriority,
      }),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || json?.error) {
      setError(json?.error ?? "Failed to create case");
      return;
    }

    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewSubject("");
    setNewDescription("");
    setNewPriority("normal");

    await loadCases();
    setSuccess("Case created.");
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
      setError(json?.error ?? "Failed to update case");
      return;
    }

    await loadCases();
    setSuccess("Updated.");
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
          setError("Forbidden");
          setLoading(false);
          return;
        }

        await loadCases();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
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
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  if (!canAccessSupport) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">{error ?? "Forbidden"}</div>
      </div>
    );
  }

  const whatsappNumber = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").trim();
  const whatsappDigits = whatsappNumber.replace(/\D/g, "");

  const waText = useMemo(() => {
    const mostRecent = rows[0] ?? null;
    const lines: string[] = [];
    lines.push("IslaPOS Support");
    if (restaurantId) lines.push(`Restaurant: ${restaurantId}`);
    if (mostRecent) {
      lines.push(`Case ID: ${mostRecent.id}`);
      lines.push(`Subject: ${mostRecent.subject}`);
      if (mostRecent.customer_name) lines.push(`Customer: ${mostRecent.customer_name}`);
      if (mostRecent.customer_phone) lines.push(`Phone: ${mostRecent.customer_phone}`);
    } else {
      const subject = newSubject.trim();
      const customer = newCustomerName.trim();
      const phone = newCustomerPhone.trim();
      const desc = newDescription.trim();
      if (subject) lines.push(`Subject: ${subject}`);
      if (customer) lines.push(`Customer: ${customer}`);
      if (phone) lines.push(`Phone: ${phone}`);
      if (desc) lines.push(`Details: ${desc}`);
    }
    return lines.join("\n");
  }, [newCustomerName, newCustomerPhone, newDescription, newSubject, restaurantId, rows]);

  const waHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(waText)}`
    : "https://wa.me/";

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Support Station</h1>
            <p className="text-sm text-[var(--mp-muted)]">Create and track support cases.</p>
          </div>
          <div className="flex gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              WhatsApp
            </a>
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Back
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm lg:col-span-1">
            <div className="text-base font-semibold">New case</div>
            <div className="mt-4 grid gap-3">
              <input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Customer phone (optional)"
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Subject"
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="min-h-28 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as SupportCasePriority)}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => void createCase()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Create case
              </button>
              <button
                onClick={() => void loadCases()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">Cases</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases"
                className="h-11 w-72 max-w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
            </div>

            <div className="mt-4 grid gap-3">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  No cases.
                </div>
              ) : (
                filtered.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">{c.subject}</div>
                        <div className="text-xs text-[var(--mp-muted)]">
                          {c.customer_name ? c.customer_name : "(no name)"}
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
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select
                          value={c.priority}
                          onChange={(e) => void updateCase(c.id, { priority: e.target.value as SupportCasePriority })}
                          className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    {c.description ? (
                      <div className="mt-3 text-sm text-[var(--mp-fg)]">{c.description}</div>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <textarea
                        defaultValue={c.internal_notes ?? ""}
                        placeholder="Internal notes"
                        onBlur={(e) => {
                          const next = e.target.value;
                          if ((c.internal_notes ?? "") === next) return;
                          void updateCase(c.id, { internal_notes: next });
                        }}
                        className="min-h-24 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
                      <textarea
                        defaultValue={c.resolution ?? ""}
                        placeholder="Resolution"
                        onBlur={(e) => {
                          const next = e.target.value;
                          if ((c.resolution ?? "") === next) return;
                          void updateCase(c.id, { resolution: next });
                        }}
                        className="min-h-24 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      />
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
