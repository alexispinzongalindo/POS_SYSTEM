"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import { listRestaurantsByOwner, type Restaurant } from "@/lib/setupData";

type TabKey = "profile" | "security" | "billing";

export default function AdminProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [tab, setTab] = useState<TabKey>("billing");

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  async function refreshRestaurants(uid: string) {
    const res = await listRestaurantsByOwner(uid);
    if (res.error) throw res.error;
    setRestaurants(res.data ?? []);
  }

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

      const r = (data.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (r === "cashier") {
        router.replace("/pos");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setRole(r);

      const uid = data.session.user.id;
      setUserId(uid);

      const cfg = await getOrCreateAppConfig(uid);
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

      setActiveRestaurantId((cfg.data?.restaurant_id as string | null) ?? null);

      try {
        await refreshRestaurants(uid);
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

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-[var(--mp-muted)]">Manage your profile and subscription.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8">
          <div className="flex flex-wrap gap-2 border-b border-[var(--mp-border)] pb-3">
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold border border-[var(--mp-border)] ${
                tab === "profile"
                  ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "bg-white/90 text-[var(--mp-fg)] hover:bg-white"
              }`}
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setTab("security")}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold border border-[var(--mp-border)] ${
                tab === "security"
                  ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "bg-white/90 text-[var(--mp-fg)] hover:bg-white"
              }`}
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => setTab("billing")}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold border border-[var(--mp-border)] ${
                tab === "billing"
                  ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "bg-white/90 text-[var(--mp-fg)] hover:bg-white"
              }`}
            >
              Billing & Subscription
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">Account Details</div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">Keep your business info up to date.</div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
                >
                  Edit
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">Restaurant</div>
                  <div className="mt-1 text-sm font-semibold">
                    {activeRestaurant?.name ?? "(no active restaurant)"}
                  </div>
                  {activeRestaurantId ? (
                    <div className="mt-1 text-xs text-zinc-500 break-all">{activeRestaurantId}</div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">Email</div>
                  <div className="mt-1 text-sm font-semibold">{email ?? "(unknown)"}</div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">Role</div>
                  <div className="mt-1 text-sm font-semibold">{role ?? "(unknown)"}</div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">User ID</div>
                  <div className="mt-1 text-xs text-zinc-500 break-all">{userId ?? ""}</div>
                </div>
              </div>

              {tab === "profile" ? (
                <div className="mt-5 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  Profile editing will be added next.
                </div>
              ) : tab === "security" ? (
                <div className="mt-5 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  Security settings will be added next.
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-base font-semibold">Your Current Plan</div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">
                    Choose the plan that fits your restaurant.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    router.push("/pricing");
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                >
                  Upgrade Plan
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                <div className="text-sm font-semibold text-emerald-900">Free Version</div>
                <div className="mt-1 text-xs text-emerald-900/80">For Lifetime</div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#fff2df] px-5 py-3 text-sm text-amber-900">
                Upgrade to unlock all features.
              </div>

              {tab === "billing" ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4">
                    <div className="text-xs text-[var(--mp-muted)]">Status</div>
                    <div className="mt-1 text-sm font-semibold">Active</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4">
                    <div className="text-xs text-[var(--mp-muted)]">Billing</div>
                    <div className="mt-1 text-sm font-semibold">Not configured</div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4 text-sm text-[var(--mp-muted)]">
                  Select “Billing & Subscription” to view plan details.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
