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
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Entrenamiento" : "Training",
    subtitle: isEs ? "Guías paso a paso para personal y configuración." : "Step-by-step guides for staff and setup.",
    back: isEs ? "← Volver" : "Back",
    searchLabel: isEs ? "Buscar" : "Search",
    searchPlaceholder: isEs ? "Buscar videos y artículos..." : "Search videos and articles...",
    searchButton: isEs ? "Buscar" : "Search",
    categoryLabel: isEs ? "Categoría" : "Category",
    all: isEs ? "Todo" : "All",
    noResults: isEs ? "No hay resultados." : "No results.",
    close: isEs ? "Cerrar" : "Close",
    categoryLabels: {
      All: isEs ? "Todo" : "All",
      "Getting Started": isEs ? "Comenzando" : "Getting Started",
      "POS Basics": isEs ? "POS Básico" : "POS Basics",
      "KDS Setup": isEs ? "Configuración KDS" : "KDS Setup",
      "Online Ordering": isEs ? "Pedidos en línea" : "Online Ordering",
      "Staff Scheduling": isEs ? "Horarios del personal" : "Staff Scheduling",
      "Account & Billing": isEs ? "Cuenta y facturación" : "Account & Billing",
      "Menu Setup": isEs ? "Configuración del menú" : "Menu Setup",
      Tables: isEs ? "Mesas" : "Tables",
    } as Record<TrainingCategory, string>,
  };

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
          {
            subtitle: lang === "es" ? "Entrenamiento (manual dentro de la app)" : "Training (in-app manual)",
            steps:
              lang === "es"
                ? [
                    "Entra a Admin → Training",
                    "Usa Search y Category para encontrar guías",
                    "Comparte estas guías con gerentes y cajeros",
                    "Tip: usa el botón 'View Tutorial' en el lado derecho del Admin",
                  ]
                : [
                    "Go to Admin → Training",
                    "Use Search and Category to find guides",
                    "Share these guides with managers and cashiers",
                    "Tip: use the 'View Tutorial' button on the right side of Admin",
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
          {
            subtitle: lang === "es" ? "Código QR del menú" : "QR code menu",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → QR Code Menu",
                    "Genera el QR",
                    "Los clientes pueden escanear el QR para ver el menú",
                    "Tip: úsalo para mesas, barra o takeout",
                  ]
                : [
                    "Go to Admin → QR Code Menu",
                    "Generate the QR",
                    "Customers can scan the QR to view the menu",
                    "Tip: use it for tables, bar, or takeout",
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
          {
            subtitle: lang === "es" ? "Reservaciones" : "Reservations",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Reservations",
                    "Crea una reservación: nombre, teléfono, tamaño de grupo, hora",
                    "Opcional: asigna un número de mesa",
                    "Puedes cancelar reservaciones desde la lista",
                  ]
                : [
                    "Go to Admin → Reservations",
                    "Create a reservation: name, phone, party size, time",
                    "Optional: assign a table number",
                    "You can cancel reservations from the list",
                  ],
          },
        ],
      },

      {
        id: "pos-basics",
        title: lang === "es" ? "4. POS (Caja)" : "4. POS (Register)",
        content: [
          {
            subtitle: lang === "es" ? "Crear una orden" : "Create an order",
            steps:
              lang === "es"
                ? [
                    "Entra a POS",
                    "Busca productos por categoría o Search",
                    "Opcional: escanea barcode/SKU",
                    "Agrega productos y ajusta cantidades",
                    "Selecciona el tipo de orden (Counter/Pickup/Delivery/Dine In)",
                  ]
                : [
                    "Open POS",
                    "Browse items by category or Search",
                    "Optional: scan barcode/SKU",
                    "Add items and adjust quantities",
                    "Select order type (Counter/Pickup/Delivery/Dine In)",
                  ],
          },
          {
            subtitle: lang === "es" ? "Mesas + tickets abiertos" : "Tables + open tickets",
            steps:
              lang === "es"
                ? [
                    "Para servicio de mesa, entra a POS → Tables",
                    "Toca una mesa para abrir acciones",
                    "Usa '+ New Order' para abrir el ticket en POS",
                    "Puedes 'Seat Guests' y 'Transfer' (mover ticket a otra mesa)",
                  ]
                : [
                    "For table service, go to POS → Tables",
                    "Tap a table to open actions",
                    "Use '+ New Order' to open the ticket in POS",
                    "You can 'Seat Guests' and 'Transfer' (move ticket to another table)",
                  ],
          },
          {
            subtitle: lang === "es" ? "Cobro y recibo" : "Checkout and receipt",
            steps:
              lang === "es"
                ? [
                    "En el panel derecho, revisa Subtotal/Tax/Total",
                    "Selecciona método de pago (ej: cash/card)",
                    "Marca como pagado para cerrar el ticket",
                    "Puedes abrir el recibo para ver detalles",
                  ]
                : [
                    "On the right panel, review Subtotal/Tax/Total",
                    "Select payment method (e.g. cash/card)",
                    "Mark as paid to close the ticket",
                    "You can open the receipt to view details",
                  ],
          },
          {
            subtitle: lang === "es" ? "Kitchen Display" : "Kitchen Display",
            steps:
              lang === "es"
                ? [
                    "Ve a POS → Kitchen Display",
                    "Las órdenes aparecen en columnas: New / Preparing / Ready",
                    "Cambia estatus con Start → Ready → Done",
                    "Tip: la vista se actualiza en tiempo real",
                  ]
                : [
                    "Go to POS → Kitchen Display",
                    "Orders appear in columns: New / Preparing / Ready",
                    "Change status with Start → Ready → Done",
                    "Tip: the view updates in real time",
                  ],
          },
        ],
      },

      {
        id: "order-history",
        title: lang === "es" ? "5. Historial de Órdenes" : "5. Order History",
        content: [
          {
            subtitle: lang === "es" ? "Ver historial" : "View history",
            steps:
              lang === "es"
                ? [
                    "En POS, haz clic en 'History'",
                    "Filtra por fecha, source y status",
                    "Selecciona una orden para ver el recibo y detalles",
                  ]
                : [
                    "In POS, click 'History'",
                    "Filter by date, source, and status",
                    "Select an order to see the receipt and details",
                  ],
          },
          {
            subtitle: lang === "es" ? "Void / Cancel / Refund" : "Void / Cancel / Refund",
            steps:
              lang === "es"
                ? [
                    "En la lista, usa 'Void' para cancelar o reembolsar",
                    "Si la orden está pagada, se procesa como Refund",
                    "Si no está pagada, se marca como Canceled",
                  ]
                : [
                    "In the list, use 'Void' to cancel or refund",
                    "If the order is paid, it will process as Refund",
                    "If it’s not paid, it will be marked as Canceled",
                  ],
          },
        ],
      },

      {
        id: "offline-mode",
        title: lang === "es" ? "6. Modo Huracán (Offline)" : "6. Hurricane Mode (Offline)",
        content: [
          {
            subtitle: lang === "es" ? "Crear tickets sin internet" : "Create tickets without internet",
            steps:
              lang === "es"
                ? [
                    "Si no hay internet, el POS puede seguir creando tickets",
                    "Los tickets se guardan localmente en el dispositivo",
                    "Cuando regrese la conexión, sincroniza desde POS → Offline",
                  ]
                : [
                    "If there is no internet, POS can keep creating tickets",
                    "Tickets are stored locally on the device",
                    "When connection returns, sync from POS → Offline",
                  ],
          },
          {
            subtitle: lang === "es" ? "Sincronizar" : "Sync",
            steps:
              lang === "es"
                ? [
                    "Ve a POS → Offline",
                    "Usa 'Sync all' para subir los tickets al cloud",
                    "Opcional: exporta JSON/CSV del queue",
                  ]
                : [
                    "Go to POS → Offline",
                    "Use 'Sync all' to upload tickets to the cloud",
                    "Optional: export JSON/CSV of the queue",
                  ],
          },
        ],
      },

      {
        id: "reports",
        title: lang === "es" ? "7. Reportes" : "7. Reports",
        content: [
          {
            subtitle: lang === "es" ? "Resumen de ventas" : "Sales summary",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Reports",
                    "Selecciona rango: Today / 7 days / 30 days",
                    "Revisa Gross/Net/Tax y tickets",
                    "Revisa ventas por método de pago",
                  ]
                : [
                    "Go to Admin → Reports",
                    "Select range: Today / 7 days / 30 days",
                    "Review Gross/Net/Tax and tickets",
                    "Review sales by payment method",
                  ],
          },
        ],
      },

      {
        id: "inventory",
        title: lang === "es" ? "8. Inventario" : "8. Inventory",
        content: [
          {
            subtitle: lang === "es" ? "Tracking de stock" : "Stock tracking",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Inventory",
                    "Activa 'Track' para productos que quieres controlar",
                    "Ajusta el stock",
                    "El stock baja automáticamente cuando una orden se marca como pagada",
                  ]
                : [
                    "Go to Admin → Inventory",
                    "Enable 'Track' for items you want to control",
                    "Adjust stock",
                    "Stock decrements automatically when an order is marked paid",
                  ],
          },
        ],
      },

      {
        id: "admin-orders",
        title: lang === "es" ? "9. Órdenes (Admin)" : "9. Orders (Admin)",
        content: [
          {
            subtitle: lang === "es" ? "Ver y filtrar órdenes" : "View and filter orders",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Orders",
                    "Filtra por status, tipo y fecha",
                    "Selecciona una orden para ver items y detalles",
                    "Puedes actualizar status (open → preparing → ready)",
                  ]
                : [
                    "Go to Admin → Orders",
                    "Filter by status, type, and date",
                    "Select an order to view items and details",
                    "You can update status (open → preparing → ready)",
                  ],
          },
        ],
      },

      {
        id: "staff-support",
        title: lang === "es" ? "10. Staff + Soporte" : "10. Staff + Support",
        content: [
          {
            subtitle: lang === "es" ? "Invitar empleados" : "Invite staff",
            steps:
              lang === "es"
                ? [
                    "En Admin (home), usa 'Invite user'",
                    "Selecciona rol: Cashier (POS) o Manager (Admin + POS)",
                    "Envía el invite al email",
                  ]
                : [
                    "On Admin (home), use 'Invite user'",
                    "Select role: Cashier (POS) or Manager (Admin + POS)",
                    "Send the invite to the email",
                  ],
          },
          {
            subtitle: lang === "es" ? "Administrar staff" : "Manage staff",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Staff",
                    "Edita nombre y PIN",
                    "Cambia roles",
                    "Usa 'Remove access' para quitar acceso",
                  ]
                : [
                    "Go to Admin → Staff",
                    "Edit name and PIN",
                    "Change roles",
                    "Use 'Remove access' to revoke access",
                  ],
          },
          {
            subtitle: lang === "es" ? "Support Station" : "Support Station",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Support Station",
                    "Crea un caso con subject, prioridad y detalles",
                    "Actualiza status y resolución",
                    "Opcional: abre WhatsApp desde el botón",
                  ]
                : [
                    "Go to Admin → Support Station",
                    "Create a case with subject, priority, and details",
                    "Update status and resolution",
                    "Optional: open WhatsApp from the button",
                  ],
          },
        ],
      },

      {
        id: "integrations",
        title: lang === "es" ? "11. Integraciones + Delivery" : "11. Integrations + Delivery",
        content: [
          {
            subtitle: lang === "es" ? "Integración de delivery" : "Delivery integrations",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Integrations → Delivery",
                    "Configura el proveedor según tu operación",
                    "Las órdenes de tipo Delivery incluyen meta (provider, tracking, address)",
                  ]
                : [
                    "Go to Admin → Integrations → Delivery",
                    "Configure the provider for your operation",
                    "Delivery orders include metadata (provider, tracking, address)",
                  ],
          },
        ],
      },

      {
        id: "restaurants-profile",
        title: lang === "es" ? "12. Restaurantes + Perfil" : "12. Restaurants + Profile",
        content: [
          {
            subtitle: lang === "es" ? "Restaurantes" : "Restaurants",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Restaurants",
                    "Crea y selecciona el restaurante activo",
                    "Tip: usa esto para multi-tenant / multi-restaurante",
                  ]
                : [
                    "Go to Admin → Restaurants",
                    "Create and select the active restaurant",
                    "Tip: use this for multi-tenant / multi-restaurant",
                  ],
          },
          {
            subtitle: lang === "es" ? "Perfil" : "Profile",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → Profile",
                    "Revisa información de la cuenta",
                    "(Facturación y suscripción: en progreso/según plan)",
                  ]
                : [
                    "Go to Admin → Profile",
                    "Review account information",
                    "(Billing/subscription: in progress / per plan)",
                  ],
          },
        ],
      },

      {
        id: "kds-qr",
        title: lang === "es" ? "13. KDS (Links/QR)" : "13. KDS (Links/QR)",
        content: [
          {
            subtitle: lang === "es" ? "Crear links de KDS" : "Create KDS links",
            steps:
              lang === "es"
                ? [
                    "Ve a Admin → KDS QR Codes",
                    "Crea un link por estación (ej: Cocina, Barra)",
                    "Imprime o muestra el QR",
                    "El staff abre la pantalla KDS escaneando el QR",
                  ]
                : [
                    "Go to Admin → KDS QR Codes",
                    "Create one link per station (e.g. Kitchen, Bar)",
                    "Print or display the QR",
                    "Staff opens the KDS screen by scanning the QR",
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
      if (s.id === "pos-basics") {
        for (const c of s.content) add(s.id, "POS Basics", "zinc", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "order-history") {
        for (const c of s.content) add(s.id, "POS Basics", "violet", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "offline-mode") {
        for (const c of s.content) add(s.id, "POS Basics", "amber", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "reports") {
        for (const c of s.content) add(s.id, "Account & Billing", "emerald", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "inventory") {
        for (const c of s.content) add(s.id, "Account & Billing", "blue", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "admin-orders") {
        for (const c of s.content) add(s.id, "Account & Billing", "zinc", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "staff-support") {
        for (const c of s.content) add(s.id, "Account & Billing", "violet", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "integrations") {
        for (const c of s.content) add(s.id, "Online Ordering", "amber", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "restaurants-profile") {
        for (const c of s.content) add(s.id, "Account & Billing", "emerald", c.subtitle, c.steps);
        continue;
      }
      if (s.id === "kds-qr") {
        for (const c of s.content) add(s.id, "KDS Setup", "blue", c.subtitle, c.steps);
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
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
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
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <div className="text-sm font-semibold">{t.searchLabel}</div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
                <button
                  type="button"
                  onClick={() => null}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
                >
                  {t.searchButton}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">{t.categoryLabel}</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TrainingCategory)}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {t.categoryLabels[c]}
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
                  {t.categoryLabels[c]}
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
              {t.all}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.length === 0 ? (
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 text-sm text-[var(--mp-muted)] sm:col-span-2 lg:col-span-3">
              {t.noResults}
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
                  <div className="text-xs font-semibold text-[var(--mp-muted)]">{t.categoryLabels[c.category]}</div>
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
                <div className="text-xs font-semibold text-[var(--mp-muted)]">{t.categoryLabels[openCard.category]}</div>
                <div className="mt-1 text-xl font-semibold">{openCard.title}</div>
                <div className="mt-2 text-sm text-[var(--mp-muted)]">{openCard.description}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenCardId(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
              >
                {t.close}
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
