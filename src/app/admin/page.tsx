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
      | { invited?: boolean; error?: string }
      | null;

    if (!res.ok || json?.error) {
      setError(json?.error ?? "Invite failed");
      return;
    }

    setInviteEmail("");
    setInviteRole("cashier");
    setInviteStatus("Invite sent.");
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
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
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Restaurants</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Create and switch between restaurants.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/restaurants")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage restaurants
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Staff</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Manage staff access and roles.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/staff")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage staff
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Reports</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Sales totals, taxes, and payment methods.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/reports")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                View reports
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Reservations</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Create and manage reservations.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/reservations")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage reservations
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Inventory</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Track stock for products.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/inventory")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Manage inventory
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Settings</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Update business info, location, taxes, and products.
            </p>

             <div className="mt-4">
               <button
                 onClick={() => router.push("/setup")}
                 className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
               >
                 Edit setup
               </button>
             </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Integrations</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Configure delivery providers for your business.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/integrations/delivery")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Delivery integrations
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">POS</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Create orders using your menu.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/pos")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Open POS
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Account details and subscription.
            </p>

            <div className="mt-4">
              <button
                onClick={() => router.push("/admin/profile")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
              >
                Open profile
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Invite user</h2>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              Invite staff to your restaurant.
            </p>

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

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">Account</h2>
            <button
              onClick={signOut}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
