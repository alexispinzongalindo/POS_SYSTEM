"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import {
  getLocationByRestaurant,
  getRestaurant,
  listRestaurantsByOwner,
  type Location,
  type Restaurant,
  upsertLocation,
  upsertRestaurant,
} from "@/lib/setupData";

type TabKey = "profile" | "security" | "billing";

export default function AdminProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [location, setLocation] = useState<Location | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  const [tab, setTab] = useState<TabKey>("profile");

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  const addressText = useMemo(() => {
    if (!location) return "N/A";
    const parts = [
      location.address1,
      location.address2,
      `${location.city}, ${location.state} ${location.postal_code}`.trim(),
      location.country,
    ]
      .filter(Boolean)
      .map((s) => (s ?? "").trim())
      .filter((s) => s.length > 0);

    return parts.length ? parts.join("\n") : "N/A";
  }, [location]);

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
      setJoinedAt((data.session.user.created_at as string | undefined) ?? null);

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

      const rid = (cfg.data?.restaurant_id as string | null) ?? null;
      if (rid) {
        const res = await getRestaurant(rid);
        if (!cancelled && res.data) {
          setBusinessName(res.data.name ?? "");
          setBusinessPhone(res.data.phone ?? "");
          setBusinessEmail(res.data.email ?? "");
        }

        const loc = await getLocationByRestaurant(rid);
        if (!cancelled && loc.data) {
          setLocation(loc.data);
          setAddress1(loc.data.address1 ?? "");
          setAddress2(loc.data.address2 ?? "");
          setCity(loc.data.city ?? "");
          setStateProv(loc.data.state ?? "");
          setPostalCode(loc.data.postal_code ?? "");
          setCountry(loc.data.country ?? "US");
        } else if (!cancelled) {
          setLocation(null);
        }
      }

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

  async function saveProfile() {
    if (!userId) return;
    if (!activeRestaurantId) {
      setProfileStatus(null);
      setError("No active restaurant selected");
      return;
    }

    setProfileStatus(null);
    setError(null);
    setSavingProfile(true);

    try {
      const restaurantRes = await getRestaurant(activeRestaurantId);
      if (restaurantRes.error) throw restaurantRes.error;
      const existing = restaurantRes.data;

      if (!existing) {
        throw new Error("Restaurant not found");
      }

      const restUp = await upsertRestaurant({
        id: existing.id,
        owner_user_id: existing.owner_user_id,
        name: businessName.trim() || existing.name,
        phone: businessPhone,
        email: businessEmail,
      });
      if (restUp.error) throw restUp.error;

      const locUp = await upsertLocation({
        id: location?.id,
        restaurant_id: activeRestaurantId,
        name: location?.name ?? "Main",
        address1: address1.trim(),
        address2: address2,
        city: city.trim(),
        state: stateProv.trim(),
        postal_code: postalCode.trim(),
        country: (country.trim() || "US").toUpperCase(),
        timezone: location?.timezone ?? "America/Puerto_Rico",
      });
      if (locUp.error) throw locUp.error;

      setLocation(locUp.data ?? null);
      setProfileStatus("Updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      setError(msg);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPwError(null);
    setPwStatus(null);

    const pw = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!pw || pw.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    if (pw !== confirm) {
      setPwError("Passwords do not match");
      return;
    }

    setPwSaving(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: pw });
      if (updErr) throw updErr;
      setNewPassword("");
      setConfirmPassword("");
      setPwStatus("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change password";
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
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
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-[var(--mp-muted)]">Manage your profile and business details to keep everything up to date.</p>
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
                <div className="text-xs text-[var(--mp-muted)]">
                  {joinedAt ? `Joined since ${new Date(joinedAt).toLocaleDateString()}` : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">Restaurant</div>
                  <div className="mt-1 text-sm font-semibold">
                    {activeRestaurant?.name ?? "(no active restaurant)"}
                  </div>
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
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">Business Name</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Business name"
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">Business Phone</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="Phone"
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">Business Email</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="Email"
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">Address</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="Address line 1"
                    />
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="Address line 2"
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={stateProv}
                        onChange={(e) => setStateProv(e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="Postal code"
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Update Information"}
                  </button>

                  {profileStatus ? <div className="text-sm text-emerald-800">{profileStatus}</div> : null}
                </div>
              ) : tab === "security" ? (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Two-factor authentication and login alerts will be added next.
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--mp-fg)]">Change Password</div>
                    <div className="mt-1 text-xs text-[var(--mp-muted)]">Password must be 8+ characters.</div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={savePassword}
                      disabled={pwSaving}
                      className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                    >
                      {pwSaving ? "Saving..." : "Save"}
                    </button>

                    {pwError ? <div className="mt-2 text-sm text-red-700">{pwError}</div> : null}
                    {pwStatus ? <div className="mt-2 text-sm text-emerald-800">{pwStatus}</div> : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
              {tab === "billing" ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold">Account Details</div>
                    <button
                      type="button"
                      onClick={() => setTab("profile")}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4">
                    <div className="text-sm font-semibold text-[var(--mp-fg)]">{businessName || activeRestaurant?.name || "(Business)"}</div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">Phone</div>
                        <div className="text-[var(--mp-fg)]">{businessPhone || "N/A"}</div>
                      </div>
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">Email</div>
                        <div className="text-[var(--mp-fg)]">{businessEmail || email || "N/A"}</div>
                      </div>
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">Address</div>
                        <div className="whitespace-pre-line text-[var(--mp-fg)]">{addressText}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                </>
              ) : (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4 text-sm text-[var(--mp-muted)]">
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
