"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "cashier">("cashier");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
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

      const userId = data.session.user.id;
      const cfg = await getOrCreateAppConfig(userId);
      if (cancelled) return;
      if (cfg.error) {
        setError(cfg.error.message);
        setLoading(false);
        return;
      }

      if (!cfg.data?.setup_complete) {
        router.replace("/setup");
        return;
      }

      setEmail(data.session.user.email ?? null);
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

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function inviteUser() {
    setInviteStatus(null);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    const res = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    const json = (await res.json().catch(() => null)) as
      | { invited?: boolean; error?: string; baseUrl?: string | null; redirectTo?: string | null }
      | null;

    if (!res.ok || json?.error) {
      const details =
        json && (json.baseUrl || json.redirectTo)
          ? ` (baseUrl=${json.baseUrl ?? ""} redirectTo=${json.redirectTo ?? ""})`
          : "";
      setError(`${json?.error ?? `Invite failed (${res.status})`}${details}`);
      return;
    }

    setInviteEmail("");
    setInviteRole("cashier");
    setInviteStatus("Invite sent.");
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
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-[var(--mp-muted)]">
            Signed in as {email ?? "(unknown)"}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {inviteStatus ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {inviteStatus}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                  <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Orders</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">
                  View and manage all orders.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => router.push("/admin/orders")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                View orders
              </button>
              <button
                onClick={() => router.push("/pos/kitchen")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50"
              >
                Kitchen
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21v-8h6v8" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Restaurants</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">
                  Create and switch between restaurants.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/restaurants")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage restaurants
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                  <path d="M8 6v12" />
                  <path d="M16 6v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Floor Plan</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Configure areas, tables, doors, and bar.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/floor")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Edit floor plan
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a3 3 0 0 0-2-2.83" />
                  <path d="M18 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Staff</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Manage staff access and roles.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/staff")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage staff
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 15v-4" />
                  <path d="M11 15V7" />
                  <path d="M15 15v-6" />
                  <path d="M19 15v-2" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Reports</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Sales totals, taxes, and payment methods.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/reports")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                View reports
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <path d="M3 10h18" />
                  <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Reservations</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Create and manage reservations.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/reservations")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage reservations
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" />
                  <path d="M12 22V12" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Inventory</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Track stock for products.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/inventory")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage inventory
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.42 3.42h-.1a1.65 1.65 0 0 0-1.81 1.17 1.65 1.65 0 0 0-.05.42V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1.18-1.81 1.65 1.65 0 0 0-.42-.05H9.1A2 2 0 0 1 7 18.6l.06-.06A1.65 1.65 0 0 0 7.4 15a1.65 1.65 0 0 0-1.57-1.15H5.7A2 2 0 0 1 4 10.4v-.1A2 2 0 0 1 5.7 8.6h.1A1.65 1.65 0 0 0 7.4 7a1.65 1.65 0 0 0-.34-1.82L7 5.12A2 2 0 0 1 8.4 2h.1A2 2 0 0 1 10.4 3.7v.1A1.65 1.65 0 0 0 12 5.4a1.65 1.65 0 0 0 1.6-1.6V3.7A2 2 0 0 1 15.6 2h.1A2 2 0 0 1 17 3.12l-.06.06A1.65 1.65 0 0 0 16.6 7a1.65 1.65 0 0 0 1.57 1.15h.1A2 2 0 0 1 22 10.4v.1a2 2 0 0 1-1.7 1.95h-.1A1.65 1.65 0 0 0 19.4 15Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Settings</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">
                  Update business info, location, taxes, and products.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/setup")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Edit setup
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7h-9" />
                  <path d="M14 17H5" />
                  <circle cx="17" cy="17" r="3" />
                  <circle cx="7" cy="7" r="3" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Integrations</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Configure delivery providers for your business.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/integrations/delivery")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Delivery integrations
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 7h.01" />
                  <path d="M17 7h.01" />
                  <path d="M7 17h.01" />
                  <path d="M17 17h.01" />
                  <path d="M7 12h10" />
                  <path d="M12 7v10" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">QR Code Menu</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Generate QR codes for customers to view your menu.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/qr-menu")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Generate QR code
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 2h10" />
                  <path d="M12 2v20" />
                  <path d="M7 7h10" />
                  <path d="M7 17h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">POS</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Create orders using your menu.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/pos")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Open POS
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Profile</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Account details and subscription.</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/profile")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Open profile
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Invite user</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Invite staff to your restaurant.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <select
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-medium outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "manager" | "cashier")}
              >
                <option value="cashier">Cashier (POS only)</option>
                <option value="manager">Manager (Admin + POS)</option>
              </select>

              <input
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                type="email"
                placeholder="user@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />

              <button
                onClick={inviteUser}
                disabled={!inviteEmail}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                Send invite
              </button>

              {inviteStatus ? (
                <div className="text-sm text-emerald-800">
                  {inviteStatus}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-gradient-to-b from-emerald-50/60 to-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mp-primary)]/10 text-[var(--mp-primary)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--mp-fg)]">Account</h2>
                <p className="mt-1 text-sm text-[var(--mp-muted)]">Sign out of this device.</p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="group flex items-center gap-2 rounded-2xl border border-[var(--mp-border)] bg-white px-3 py-2 shadow-sm"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mp-primary)] text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-[var(--mp-fg)] [writing-mode:vertical-rl] [text-orientation:mixed]">
            View Tutorial
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowAiPanel(true)}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-violet-500 to-indigo-600 text-white shadow-lg"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
            <path d="M4 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
          </svg>
        </button>
      </div>

      {showAiPanel ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setShowAiPanel(false)}
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[var(--mp-border)] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--mp-border)] px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-[var(--mp-fg)]">AI Assistant</div>
                <div className="mt-1 text-xs text-[var(--mp-muted)]">Ask for help configuring your restaurant.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPanel(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                AI chat will be wired next. For now, use “View Tutorial” for training.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
