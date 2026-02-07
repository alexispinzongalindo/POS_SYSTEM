"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig, setRestaurantId } from "@/lib/appConfig";
import { listRestaurantsByOwner, upsertRestaurant, type Restaurant } from "@/lib/setupData";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Restaurantes" : "Restaurants",
    subtitle: isEs ? "Crea y cambia entre restaurantes." : "Create and switch between restaurants.",
    back: isEs ? "Volver" : "Back",
    loadFailed: isEs ? "No se pudieron cargar los restaurantes" : "Failed to load restaurants",
    createdActive: isEs ? "Restaurante creado y activado." : "Restaurant created and set as active.",
    created: isEs ? "Restaurante creado." : "Restaurant created.",
    activeUpdated: isEs ? "Restaurante activo actualizado." : "Active restaurant updated.",
    createTitle: isEs ? "Crear restaurante" : "Create restaurant",
    createBody: isEs ? "Agrega un nuevo restaurante a tu cuenta." : "Add a new restaurant under your account.",
    namePlaceholder: isEs ? "Nombre del restaurante" : "Restaurant name",
    createBtn: isEs ? "Crear" : "Create",
    activeTitle: isEs ? "Restaurante activo" : "Active restaurant",
    activeBody: isEs
      ? "Define cuál restaurante usan POS, setup y Admin."
      : "This controls which restaurant the POS, setup, and admin pages operate on.",
    noneActive: isEs ? "No hay restaurante activo aún." : "No active restaurant selected yet.",
    publicMenu: isEs ? "Enlace público del menú" : "Public menu link",
    openMenu: isEs ? "Abrir menú" : "Open menu",
    copyLink: isEs ? "Copiar enlace" : "Copy link",
    linkCopied: isEs ? "Enlace copiado." : "Menu link copied.",
    copyFailed: isEs ? "No se pudo copiar. Copia manualmente." : "Failed to copy. Please copy manually.",
    yourRestaurants: isEs ? "Tus restaurantes" : "Your restaurants",
    chooseActive: isEs ? "Elige cuál restaurante está activo." : "Choose which restaurant is active.",
    noneYet: isEs ? "No hay restaurantes todavía." : "No restaurants yet.",
    active: isEs ? "Activo" : "Active",
    setActive: isEs ? "Activar" : "Set active",
    idLabel: isEs ? "ID" : "ID",
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [origin, setOrigin] = useState<string>("");

  const [userId, setUserId] = useState<string | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [newName, setNewName] = useState("");

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  async function refresh(uid: string) {
    const res = await listRestaurantsByOwner(uid);
    if (res.error) throw res.error;
    setRestaurants(res.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      if (typeof window !== "undefined") {
        setOrigin(window.location.origin);
      }

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

      const uid = data.session.user.id;
      setUserId(uid);

      const cfg = await getOrCreateAppConfig(uid);
      if (cancelled) return;

      if (cfg.error) {
        setError(cfg.error.message);
        setLoading(false);
        return;
      }

      setActiveRestaurantId((cfg.data?.restaurant_id as string | null) ?? null);

      try {
        await refresh(uid);
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

  async function onCreateRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) {
      router.replace("/login");
      return;
    }

    const name = newName.trim();
    if (!name) return;

    const res = await upsertRestaurant({ owner_user_id: userId, name });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewName("");
    await refresh(userId);

    const createdId = res.data?.id ?? null;
    if (createdId) {
      setActiveRestaurantId(createdId);
      setSuccess(t.createdActive);
      return;
    }

    setSuccess(t.created);
  }

  async function setActive(id: string) {
    setError(null);
    setSuccess(null);

    const res = await setRestaurantId(id);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setActiveRestaurantId(id);
    setSuccess(t.activeUpdated);
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">{t.createTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t.createBody}
            </p>

            <form onSubmit={onCreateRestaurant} className="mt-4 flex gap-2">
              <input
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder={t.namePlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!newName.trim()}
              >
                {t.createBtn}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">{t.activeTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t.activeBody}
            </p>

            <div className="mt-4 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              {activeRestaurant ? (
                <div className="flex flex-col gap-1">
                  <div className="font-medium">{activeRestaurant.name}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{t.idLabel}: {activeRestaurant.id}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.noneActive}
                </div>
              )}
            </div>

            {activeRestaurant ? (
              <div className="mt-4">
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t.publicMenu}</div>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                  {`${origin}/menu/${activeRestaurant.id}`}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => router.push(`/menu/${activeRestaurant.id}`)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                  >
                    {t.openMenu}
                  </button>

                  <button
                    onClick={async () => {
                      const url = `${origin}/menu/${activeRestaurant.id}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setSuccess(t.linkCopied);
                      } catch {
                        setError(t.copyFailed);
                      }
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                  >
                    {t.copyLink}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">{t.yourRestaurants}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t.chooseActive}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {restaurants.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.noneYet}</div>
            ) : (
              restaurants.map((r) => {
                const isActive = r.id === activeRestaurantId;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.id}</div>
                    </div>
                    <button
                      onClick={() => void setActive(r.id)}
                      disabled={isActive}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                    >
                      {isActive ? t.active : t.setActive}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
