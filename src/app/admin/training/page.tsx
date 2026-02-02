"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import { useMarketingLang } from "@/lib/useMarketingLang";

type Section = {
  id: string;
  title: string;
  content: Array<{ subtitle: string; steps: string[] }>;
};

type TrainingCategory =
  | "All"
  | "Getting Started"
  | "POS Basics"
  | "KDS Setup"
  | "Online Ordering"
  | "Staff Scheduling"
  | "Account & Billing"
  | "Menu Setup"
  | "Tables";

type TrainingCard = {
  id: string;
  category: TrainingCategory;
  title: string;
  description: string;
  steps: string[];
  accent: "emerald" | "blue" | "amber" | "violet" | "zinc";
};

export default function AdminTrainingPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TrainingCategory>("All");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const sections: Section[] = useMemo(
    () => [
      {
        id: "getting-started",
        title: lang === "es" ? "1. Comenzando" : "1. Getting Started",
        content: [
          {
            subtitle: lang === "es" ? "Crear cuenta" : "Create Account",
            steps:
              lang === "es"
                ? [
                    "Ve a la página principal y haz clic en 'Crear cuenta'",
                    "Ingresa tu email y contraseña",
                    "Revisa tu email para verificar la cuenta",
                    "Haz clic en el enlace de verificación",
                  ]
                : [
                    "Go to the main page and click 'Create account'",
                    "Enter your email and password",
                    "Check your email to verify the account",
                    "Click the verification link",
                  ],
          },
          {
            subtitle: lang === "es" ? "Configuración inicial" : "Initial Setup",
            steps:
              lang === "es"
                ? [
                    "Después de verificar, inicia sesión",
                    "Serás dirigido a la página de Setup",
                    "Ingresa el nombre de tu restaurante",
                    "Configura tu ubicación y zona horaria",
                    "Configura el IVU (impuesto de Puerto Rico)",
                  ]
                : [
                    "After verifying, sign in",
                    "You'll be directed to the Setup page",
                    "Enter your restaurant name",
                    "Set your location and timezone",
                    "Configure IVU (Puerto Rico tax)",
                  ],
          },
        ],
      },
      {
        id: "menu-setup",
        title: lang === "es" ? "2. Configurar el Menú" : "2. Menu Setup",
        content: [
          {
            subtitle: lang === "es" ? "Crear categorías" : "Create Categories",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Menú",
                    "Haz clic en 'Nueva Categoría'",
                    "Ingresa el nombre (ej: Entradas, Platos Principales, Bebidas)",
                    "Guarda la categoría",
                    "Repite para todas tus categorías",
                  ]
                : [
                    "Go to Admin → Menu",
                    "Click 'New Category'",
                    "Enter the name (e.g., Appetizers, Main Courses, Drinks)",
                    "Save the category",
                    "Repeat for all your categories",
                  ],
          },
          {
            subtitle: lang === "es" ? "Agregar productos" : "Add Products",
            steps:
              lang === "es"
                ? [
                    "Dentro de una categoría, haz clic en 'Nuevo Producto'",
                    "Ingresa el nombre del producto",
                    "Ingresa el precio",
                    "Opcional: agrega descripción, SKU, código de barras",
                    "Opcional: sube una imagen",
                    "Guarda el producto",
                  ]
                : [
                    "Inside a category, click 'New Product'",
                    "Enter the product name",
                    "Enter the price",
                    "Optional: add description, SKU, barcode",
                    "Optional: upload an image",
                    "Save the product",
                  ],
          },
          {
            subtitle: lang === "es" ? "Modificadores (extras)" : "Modifiers (extras)",
            steps:
              lang === "es"
                ? [
                    "Los modificadores son opciones adicionales (ej: tamaño, extras)",
                    "Ve a Admin → Modificadores",
                    "Crea un grupo de modificadores (ej: 'Tamaño')",
                    "Agrega opciones al grupo (ej: Pequeño +$0, Grande +$2)",
                    "Asigna el grupo a los productos que lo necesiten",
                  ]
                : [
                    "Modifiers are additional options (e.g., size, extras)",
                    "Go to Admin → Modifiers",
                    "Create a modifier group (e.g., 'Size')",
                    "Add options to the group (e.g., Small +$0, Large +$2)",
                    "Assign the group to products that need it",
                  ],
          },
        ],
      },
      {
        id: "tables-setup",
        title: lang === "es" ? "3. Configurar Mesas" : "3. Tables Setup",
        content: [
          {
            subtitle: lang === "es" ? "Mesas simples" : "Simple Tables",
            steps:
              lang === "es"
                ? [
                    "Por defecto tienes 20 mesas numeradas",
                    "Ve a POS → Tables para ver todas las mesas",
                    "Puedes cambiar el número de mesas en la configuración",
                    "Las mesas muestran 'Available' o 'Occupied'",
                  ]
                : [
                    "By default you have 20 numbered tables",
                    "Go to POS → Tables to see all tables",
                    "You can change the number of tables in settings",
                    "Tables show 'Available' or 'Occupied'",
                  ],
          },
          {
            subtitle: lang === "es" ? "Plano de piso (Floor Plan)" : "Floor Plan",
            steps:
              lang === "es"
                ? [
                    "Para un layout visual, ve a Admin → Floor Plan",
                    "Crea áreas (ej: Salón Principal, Patio, Barra)",
                    "Arrastra y coloca mesas en cada área",
                    "Asigna números y capacidad a cada mesa",
                    "El plano se guarda automáticamente para uso offline",
                  ]
                : [
                    "For a visual layout, go to Admin → Floor Plan",
                    "Create areas (e.g., Main Salon, Patio, Bar)",
                    "Drag and place tables in each area",
                    "Assign numbers and capacity to each table",
                    "The floor plan is automatically saved for offline use",
                  ],
          },
        ],
      },
    ],
    [lang],
  );

  const cards: TrainingCard[] = useMemo(() => {
    const all: TrainingCard[] = [];

    function add(sectionId: string, category: TrainingCategory, accent: TrainingCard["accent"], subtitle: string, steps: string[]) {
      all.push({
        id: `${sectionId}:${subtitle}`,
        category,
        title: subtitle,
        description: steps[0] ? String(steps[0]) : "",
        steps,
        accent,
      });
    }

    for (const s of sections) {
      if (s.id === "getting-started") {
        for (const c of s.content) add(s.id, "Getting Started", "emerald", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "menu-setup") {
        for (const c of s.content) add(s.id, "Menu Setup", "blue", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "tables-setup") {
        for (const c of s.content) add(s.id, "Tables", "amber", c.subtitle, c.steps);
        continue;
      }
      for (const c of s.content) add(s.id, "POS Basics", "zinc", c.subtitle, c.steps);
    }

    if (all.length === 0) {
      all.push({
        id: "stub:account-billing",
        category: "Account & Billing",
        title: lang === "es" ? "Suscripción y facturación" : "Subscription & billing",
        description: lang === "es" ? "Guía rápida de planes y facturas." : "Quick guide to plans and invoices.",
        steps: [lang === "es" ? "(Contenido pronto)" : "(Content coming soon)"],
        accent: "violet",
      });
    }

    return all;
  }, [lang, sections]);

  const categories: TrainingCategory[] = useMemo(
    () => [
      "All",
      "Getting Started",
      "POS Basics",
      "KDS Setup",
      "Online Ordering",
      "Staff Scheduling",
      "Account & Billing",
      "Menu Setup",
      "Tables",
    ],
    [],
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (!q) return true;
      const hay = `${c.title}\n${c.description}\n${c.steps.join("\n")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [cards, category, search]);

  const openCard = useMemo(() => {
    if (!openCardId) return null;
    return cards.find((c) => c.id === openCardId) ?? null;
  }, [cards, openCardId]);

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

      const cfg = await getOrCreateAppConfig(data.session.user.id);
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
            <h1 className="text-3xl font-semibold tracking-tight">Training</h1>
            <p className="text-sm text-[var(--mp-muted)]">Step-by-step guides for staff and setup.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <div className="text-sm font-semibold">Search</div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === "es" ? "Buscar videos y artículos..." : "Search videos and articles..."}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
                <button
                  type="button"
                  onClick={() => null}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
                >
                  {lang === "es" ? "Buscar" : "Search"}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TrainingCategory)}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories
              .filter((c) => c !== "All")
              .map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                      active
                        ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                        : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => setCategory("All")}
              className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                category === "All"
                  ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
              }`}
            >
              {lang === "es" ? "Todo" : "All"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.length === 0 ? (
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 text-sm text-[var(--mp-muted)] sm:col-span-2 lg:col-span-3">
              {lang === "es" ? "No hay resultados." : "No results."}
            </div>
          ) : (
            filteredCards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenCardId(c.id)}
                className="overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-white/90 text-left shadow-sm transition hover:bg-white"
              >
                <div
                  className={`aspect-[16/9] w-full ${
                    c.accent === "emerald"
                      ? "bg-gradient-to-br from-emerald-100 to-white"
                      : c.accent === "blue"
                        ? "bg-gradient-to-br from-blue-100 to-white"
                        : c.accent === "amber"
                          ? "bg-gradient-to-br from-amber-100 to-white"
                          : c.accent === "violet"
                            ? "bg-gradient-to-br from-violet-100 to-white"
                            : "bg-gradient-to-br from-zinc-100 to-white"
                  }`}
                />
                <div className="p-5">
                  <div className="text-xs font-semibold text-[var(--mp-muted)]">{c.category}</div>
                  <div className="mt-1 text-base font-semibold text-[var(--mp-fg)]">{c.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-[var(--mp-muted)]">{c.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {openCard ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setOpenCardId(null)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--mp-border)] bg-[#fffdf7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--mp-muted)]">{openCard.category}</div>
                <div className="mt-1 text-xl font-semibold">{openCard.title}</div>
                <div className="mt-2 text-sm text-[var(--mp-muted)]">{openCard.description}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenCardId(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {openCard.steps.map((step, idx) => (
                <div key={`${openCard.id}:${idx}`} className="flex items-start gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mp-primary)]/10 text-xs font-semibold text-[var(--mp-primary)]">
                    {idx + 1}
                  </div>
                  <div className="text-[var(--mp-fg)]">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
