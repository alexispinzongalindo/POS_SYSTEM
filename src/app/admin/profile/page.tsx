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
import { useMarketingLang } from "@/lib/useMarketingLang";

type TabKey = "profile" | "security" | "billing";

export default function AdminProfilePage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Perfil" : "Profile",
    subtitle: isEs ? "Administra tu perfil y los datos del negocio." : "Manage your profile and business details to keep everything up to date.",
    back: isEs ? "← Volver" : "Back",
    editProfileTab: isEs ? "Editar Perfil" : "Edit Profile",
    securityTab: isEs ? "Seguridad" : "Security",
    billingTab: isEs ? "Facturación y suscripción" : "Billing & Subscription",
    accountDetails: isEs ? "Detalles de la cuenta" : "Account Details",
    keepInfo: isEs ? "Mantén tu información del negocio al día." : "Keep your business info up to date.",
    joinedSince: (date: string) => (isEs ? `Desde ${date}` : `Joined since ${date}`),
    restaurant: isEs ? "Restaurante" : "Restaurant",
    email: isEs ? "Correo" : "Email",
    role: isEs ? "Rol" : "Role",
    userId: isEs ? "ID de usuario" : "User ID",
    noActiveRestaurant: isEs ? "(sin restaurante activo)" : "(no active restaurant)",
    unknown: isEs ? "(desconocido)" : "(unknown)",
    businessName: isEs ? "Nombre del negocio" : "Business Name",
    businessPhone: isEs ? "Teléfono del negocio" : "Business Phone",
    businessEmail: isEs ? "Correo del negocio" : "Business Email",
    address: isEs ? "Dirección" : "Address",
    address1: isEs ? "Dirección línea 1" : "Address line 1",
    address2: isEs ? "Dirección línea 2" : "Address line 2",
    city: isEs ? "Ciudad" : "City",
    state: isEs ? "Estado" : "State",
    postal: isEs ? "Código postal" : "Postal code",
    country: isEs ? "País" : "Country",
    saving: isEs ? "Guardando..." : "Saving...",
    updateInfo: isEs ? "Actualizar información" : "Update Information",
    updated: isEs ? "Actualizado" : "Updated",
    twoFactorNote: isEs ? "Próximamente: autenticación de dos factores y alertas de inicio de sesión." : "Two-factor authentication and login alerts will be added next.",
    changePassword: isEs ? "Cambiar contraseña" : "Change Password",
    passwordHint: isEs ? "La contraseña debe tener 8+ caracteres." : "Password must be 8+ characters.",
    newPassword: isEs ? "Nueva contraseña" : "New Password",
    confirmPassword: isEs ? "Confirmar contraseña" : "Confirm Password",
    save: isEs ? "Guardar" : "Save",
    edit: isEs ? "Editar" : "Edit",
    phone: isEs ? "Teléfono" : "Phone",
    yourPlan: isEs ? "Tu plan actual" : "Your Current Plan",
    planHint: isEs ? "Elige el plan que mejor se adapte a tu restaurante." : "Choose the plan that fits your restaurant.",
    upgradePlan: isEs ? "Mejorar plan" : "Upgrade Plan",
    freeVersion: isEs ? "Versión gratuita" : "Free Version",
    forLifetime: isEs ? "De por vida" : "For Lifetime",
    upgradeUnlock: isEs ? "Mejora para desbloquear todas las funciones." : "Upgrade to unlock all features.",
    selectBilling: isEs ? "Selecciona “Facturación y suscripción” para ver los detalles del plan." : "Select “Billing & Subscription” to view plan details.",
    dangerZone: isEs ? "Zona peligrosa" : "Danger Zone",
    wipeWarning: isEs
      ? "El borrado total elimina tu restaurante, todos los datos y todas las cuentas de personal. Esto no se puede deshacer."
      : "Full wipe deletes your restaurant, all data, and all staff accounts. This cannot be undone.",
    typeWipe: isEs ? "Escribe WIPE para habilitar" : "Type WIPE to enable",
    wiping: isEs ? "Borrando..." : "Wiping...",
    fullWipe: isEs ? "Borrado total (eliminar todo)" : "Full Wipe (Delete Everything)",
    na: isEs ? "N/D" : "N/A",
    businessFallback: isEs ? "(Negocio)" : "(Business)",
    notSignedIn: isEs ? "No has iniciado sesión" : "Not signed in",
    fullWipeFailed: isEs ? "Fallo el borrado total" : "Full wipe failed",
    failedToLoad: isEs ? "No se pudo cargar" : "Failed to load",
    noActiveSelected: isEs ? "No hay restaurante activo seleccionado" : "No active restaurant selected",
    restaurantNotFound: isEs ? "Restaurante no encontrado" : "Restaurant not found",
    failedToUpdate: isEs ? "No se pudo actualizar" : "Failed to update",
    passwordMin: isEs ? "La contraseña debe tener al menos 8 caracteres" : "Password must be at least 8 characters",
    passwordMismatch: isEs ? "Las contraseñas no coinciden" : "Passwords do not match",
    saved: isEs ? "Guardado" : "Saved",
    failedChangePassword: isEs ? "No se pudo cambiar la contraseña" : "Failed to change password",
    wiped: isEs ? "Borrado" : "Wiped",
  };

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

  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wipeSaving, setWipeSaving] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wipeStatus, setWipeStatus] = useState<string | null>(null);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  const addressText = useMemo(() => {
    if (!location) return t.na;
    const parts = [
      location.address1,
      location.address2,
      `${location.city}, ${location.state} ${location.postal_code}`.trim(),
      location.country,
    ]
      .filter(Boolean)
      .map((s) => (s ?? "").trim())
      .filter((s) => s.length > 0);

    return parts.length ? parts.join("\n") : t.na;
  }, [location, t]);

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

  async function runFullWipe() {
    if (wipeConfirm.trim().toUpperCase() !== "WIPE") return;
    setWipeError(null);
    setWipeStatus(null);
    setWipeSaving(true);

    try {
      const res = await authedFetch("/api/admin/full-wipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: wipeConfirm.trim() }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; warning?: string }
        | null;

      if (!res.ok || json?.error) {
        throw new Error(json?.error ?? t.fullWipeFailed);
      }

      setWipeStatus(json?.warning ?? t.wiped);

      // After wipe, the current user may be deleted. Try to sign out anyway.
      await supabase.auth.signOut().catch(() => null);
      router.replace("/login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.fullWipeFailed;
      setWipeError(msg);
    } finally {
      setWipeSaving(false);
    }
  }

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
      if (r === "cashier" || r === "kitchen" || r === "maintenance" || r === "driver" || r === "security") {
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
        const msg = e instanceof Error ? e.message : t.failedToLoad;
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
      setError(t.noActiveSelected);
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
        throw new Error(t.restaurantNotFound);
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
      setProfileStatus(t.updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.failedToUpdate;
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
      setPwError(t.passwordMin);
      return;
    }
    if (pw !== confirm) {
      setPwError(t.passwordMismatch);
      return;
    }

    setPwSaving(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: pw });
      if (updErr) throw updErr;
      setNewPassword("");
      setConfirmPassword("");
      setPwStatus(t.saved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.failedChangePassword;
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">{t.loading}</div>
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
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            {t.back}
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
              {t.editProfileTab}
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
              {t.securityTab}
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
              {t.billingTab}
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{t.accountDetails}</div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">{t.keepInfo}</div>
                </div>
                <div className="text-xs text-[var(--mp-muted)]">
                  {joinedAt ? t.joinedSince(new Date(joinedAt).toLocaleDateString()) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">{t.restaurant}</div>
                  <div className="mt-1 text-sm font-semibold">
                    {activeRestaurant?.name ?? t.noActiveRestaurant}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">{t.email}</div>
                  <div className="mt-1 text-sm font-semibold">{email ?? t.unknown}</div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">{t.role}</div>
                  <div className="mt-1 text-sm font-semibold">{role ?? t.unknown}</div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="text-xs text-[var(--mp-muted)]">{t.userId}</div>
                  <div className="mt-1 text-xs text-zinc-500 break-all">{userId ?? ""}</div>
                </div>
              </div>

              {tab === "profile" ? (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">{t.businessName}</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={t.businessName}
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">{t.businessPhone}</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder={t.phone}
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">{t.businessEmail}</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder={t.email}
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-xs text-[var(--mp-muted)]">{t.address}</div>
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder={t.address1}
                    />
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder={t.address2}
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t.city}
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={stateProv}
                        onChange={(e) => setStateProv(e.target.value)}
                        placeholder={t.state}
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder={t.postal}
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder={t.country}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                  >
                    {savingProfile ? t.saving : t.updateInfo}
                  </button>

                  {profileStatus ? <div className="text-sm text-emerald-800">{profileStatus}</div> : null}
                </div>
              ) : tab === "security" ? (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t.twoFactorNote}
                  </div>

                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--mp-fg)]">{t.changePassword}</div>
                    <div className="mt-1 text-xs text-[var(--mp-muted)]">{t.passwordHint}</div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.newPassword}
                      />
                      <input
                        className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPassword}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={savePassword}
                      disabled={pwSaving}
                      className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                    >
                      {pwSaving ? t.saving : t.save}
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
                    <div className="text-base font-semibold">{t.accountDetails}</div>
                    <button
                      type="button"
                      onClick={() => setTab("profile")}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
                    >
                      {t.edit}
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4">
                    <div className="text-sm font-semibold text-[var(--mp-fg)]">
                      {businessName || activeRestaurant?.name || t.businessFallback}
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">{t.phone}</div>
                        <div className="text-[var(--mp-fg)]">{businessPhone || t.na}</div>
                      </div>
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">{t.email}</div>
                        <div className="text-[var(--mp-fg)]">{businessEmail || email || t.na}</div>
                      </div>
                      <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                        <div className="text-[var(--mp-muted)]">{t.address}</div>
                        <div className="whitespace-pre-line text-[var(--mp-fg)]">{addressText}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold">{t.yourPlan}</div>
                      <div className="mt-1 text-sm text-[var(--mp-muted)]">{t.planHint}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        router.push("/pricing");
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                    >
                      {t.upgradePlan}
                    </button>
                  </div>

                  <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                    <div className="text-sm font-semibold text-emerald-900">{t.freeVersion}</div>
                    <div className="mt-1 text-xs text-emerald-900/80">{t.forLifetime}</div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#fff2df] px-5 py-3 text-sm text-amber-900">
                    {t.upgradeUnlock}
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4 text-sm text-[var(--mp-muted)]">
                    {t.selectBilling}
                  </div>

                  <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5">
                    <div className="text-base font-semibold text-red-900">{t.dangerZone}</div>
                    <div className="mt-1 text-sm text-red-900/80">
                      {t.wipeWarning}
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="text-xs font-semibold text-red-900/80">{t.typeWipe}</div>
                      <input
                        value={wipeConfirm}
                        onChange={(e) => setWipeConfirm(e.target.value)}
                        className="h-11 w-full rounded-xl border border-red-200 bg-white px-4 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        placeholder="WIPE"
                      />

                      <button
                        type="button"
                        onClick={runFullWipe}
                        disabled={wipeSaving || wipeConfirm.trim().toUpperCase() !== "WIPE"}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {wipeSaving ? t.wiping : t.fullWipe}
                    </button>

                      {wipeError ? <div className="text-sm text-red-800">{wipeError}</div> : null}
                      {wipeStatus ? <div className="text-sm text-emerald-800">{wipeStatus}</div> : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
