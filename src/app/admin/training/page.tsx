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

export default function AdminTrainingPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
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

        <div className="mt-8 grid gap-4">
          {sections.map((s) => (
            <div key={s.id} className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
              <div className="text-lg font-semibold">{s.title}</div>
              <div className="mt-4 grid gap-4">
                {s.content.map((c) => (
                  <div key={c.subtitle} className="rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4">
                    <div className="text-sm font-semibold">{c.subtitle}</div>
                    <div className="mt-3 grid gap-2">
                      {c.steps.map((step, idx) => (
                        <div key={`${s.id}-${c.subtitle}-${idx}`} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mp-primary)]/10 text-xs font-semibold text-[var(--mp-primary)]">
                            {idx + 1}
                          </div>
                          <div className="text-[var(--mp-fg)]">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
