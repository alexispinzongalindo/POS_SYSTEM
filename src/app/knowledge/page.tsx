"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { useMarketingLang } from "@/lib/useMarketingLang";

type ManualSection = {
  id: string;
  title: { en: string; es: string };
  goal: { en: string; es: string };
  steps: { en: string[]; es: string[] };
};

const SECTIONS: ManualSection[] = [
  {
    id: "login-setup",
    title: { en: "Login & Setup", es: "Login y Configuración" },
    goal: { en: "Create your account and finish initial setup.", es: "Crear cuenta y completar configuración inicial." },
    steps: {
      en: [
        "Go to the Sign In page and click Create account.",
        "Enter your email and a secure password.",
        "Check your inbox and click the verification link.",
        "Sign in after verification.",
        "Complete Setup: restaurant name, location, timezone, and IVU tax.",
        "Finish Setup to unlock Admin and POS.",
        "If needed, return to Setup from Admin later.",
      ],
      es: [
        "Ve a Iniciar sesión y haz clic en Crear cuenta.",
        "Ingresa tu email y una contraseña segura.",
        "Revisa tu correo y abre el enlace de verificación.",
        "Inicia sesión después de verificar.",
        "Completa Setup: nombre, ubicación, zona horaria e IVU.",
        "Finaliza Setup para desbloquear Admin y POS.",
        "Si hace falta, vuelve a Setup desde Admin.",
      ],
    },
  },
  {
    id: "menu",
    title: { en: "Menu Setup", es: "Configuración del Menú" },
    goal: { en: "Build categories, products, and modifiers.", es: "Crear categorías, productos y modificadores." },
    steps: {
      en: [
        "Go to Admin → Menu.",
        "Click New Category and name it (Appetizers, Mains, Drinks).",
        "Open the category and click New Product.",
        "Enter product name and price.",
        "Optional: add description, SKU, barcode, and image.",
        "Save the product.",
        "Go to Admin → Modifiers.",
        "Create a modifier group (e.g., Size).",
        "Add options (Small, Medium, Large) and set prices.",
        "Assign the modifier group to the products that need it.",
      ],
      es: [
        "Ve a Admin → Menú.",
        "Haz clic en Nueva categoría y nómbrala (Entradas, Platos, Bebidas).",
        "Abre la categoría y haz clic en Nuevo producto.",
        "Ingresa nombre y precio.",
        "Opcional: descripción, SKU, código de barras e imagen.",
        "Guarda el producto.",
        "Ve a Admin → Modificadores.",
        "Crea un grupo (ej. Tamaño).",
        "Agrega opciones (Pequeño, Mediano, Grande) y precios.",
        "Asigna el grupo a los productos que lo necesiten.",
      ],
    },
  },
  {
    id: "pos",
    title: { en: "POS Orders", es: "Órdenes en POS" },
    goal: { en: "Create and close orders quickly.", es: "Crear y cerrar órdenes rápido." },
    steps: {
      en: [
        "Go to POS.",
        "Select items by category or use Search.",
        "Adjust quantities if needed.",
        "Select order type (Counter / Pickup / Delivery / Dine‑in).",
        "Review subtotal, tax, and total on the right panel.",
        "Choose payment method (cash/card).",
        "Confirm and mark as paid to close the order.",
      ],
      es: [
        "Ve a POS.",
        "Selecciona productos por categoría o usa búsqueda.",
        "Ajusta cantidades si es necesario.",
        "Elige tipo (Mostrador / Pickup / Delivery / Mesa).",
        "Revisa subtotal, IVU y total en el panel derecho.",
        "Elige método de pago (cash/card).",
        "Confirma y marca como pagada para cerrar la orden.",
      ],
    },
  },
  {
    id: "tables",
    title: { en: "Tables & Floor Plan", es: "Mesas y Plano de Piso" },
    goal: { en: "Manage table service visually.", es: "Administrar servicio de mesa con plano." },
    steps: {
      en: [
        "Open POS → Tables to see and open tickets by table.",
        "For layout editing, go to Admin → Floor Plan.",
        "Create areas (Main Salon, Patio, Bar).",
        "Click a table to edit seats, size, and shape.",
        "Drag tables to position them in the area.",
      ],
      es: [
        "Abre POS → Mesas para ver y abrir tickets por mesa.",
        "Para editar el layout, ve a Admin → Floor Plan.",
        "Crea áreas (Salón, Patio, Barra).",
        "Haz clic en una mesa para editar sillas, tamaño y forma.",
        "Arrastra mesas para colocarlas en el área.",
      ],
    },
  },
  {
    id: "kds",
    title: { en: "KDS (Kitchen Display)", es: "KDS (Pantalla de Cocina)" },
    goal: { en: "Show orders to the kitchen.", es: "Mostrar órdenes en cocina." },
    steps: {
      en: [
        "Go to Admin → KDS QR Codes.",
        "Create a link per station (Kitchen, Bar).",
        "Print or display the QR code on a device.",
        "Staff scans the QR to open KDS.",
        "Orders appear in columns and update automatically.",
      ],
      es: [
        "Ve a Admin → KDS QR Codes.",
        "Crea un link por estación (Cocina, Barra).",
        "Imprime o muestra el QR en un dispositivo.",
        "El personal escanea el QR para abrir KDS.",
        "Las órdenes aparecen en columnas y se actualizan solas.",
      ],
    },
  },
];

export default function KnowledgePage() {
  const { lang } = useMarketingLang();
  const isEs = lang === "es";

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <MarketingSection
            eyebrow={isEs ? "Manual de Usuario" : "User Manual"}
            title={isEs ? "Guía completa de IslaPOS" : "Complete IslaPOS Guide"}
            subtitle={
              isEs
                ? "Aprende las funciones principales paso a paso."
                : "Learn the core features step by step."
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {SECTIONS.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">
                    {isEs ? section.title.es : section.title.en}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--mp-muted)]">
                    {isEs ? section.goal.es : section.goal.en}
                  </p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
                    {(isEs ? section.steps.es : section.steps.en).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </MarketingSection>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
