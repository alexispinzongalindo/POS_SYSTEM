"use client";

import { useMarketingLang } from "@/lib/useMarketingLang";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

export default function TrainingPage() {
  const { lang } = useMarketingLang();

  const sections = [
    {
      id: "getting-started",
      title: lang === "es" ? "1. Comenzando" : "1. Getting Started",
      content: [
        {
          subtitle: lang === "es" ? "Crear cuenta" : "Create Account",
          steps: lang === "es" ? [
            "Ve a la página principal y haz clic en 'Crear cuenta'",
            "Ingresa tu email y contraseña",
            "Revisa tu email para verificar la cuenta",
            "Haz clic en el enlace de verificación",
          ] : [
            "Go to the main page and click 'Create account'",
            "Enter your email and password",
            "Check your email to verify the account",
            "Click the verification link",
          ],
        },
        {
          subtitle: lang === "es" ? "Configuración inicial" : "Initial Setup",
          steps: lang === "es" ? [
            "Después de verificar, inicia sesión",
            "Serás dirigido a la página de Setup",
            "Ingresa el nombre de tu restaurante",
            "Configura tu ubicación y zona horaria",
            "Configura el IVU (impuesto de Puerto Rico)",
          ] : [
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
          steps: lang === "es" ? [
            "Ve a Admin → Menú",
            "Haz clic en 'Nueva Categoría'",
            "Ingresa el nombre (ej: Entradas, Platos Principales, Bebidas)",
            "Guarda la categoría",
            "Repite para todas tus categorías",
          ] : [
            "Go to Admin → Menu",
            "Click 'New Category'",
            "Enter the name (e.g., Appetizers, Main Courses, Drinks)",
            "Save the category",
            "Repeat for all your categories",
          ],
        },
        {
          subtitle: lang === "es" ? "Agregar productos" : "Add Products",
          steps: lang === "es" ? [
            "Dentro de una categoría, haz clic en 'Nuevo Producto'",
            "Ingresa el nombre del producto",
            "Ingresa el precio",
            "Opcional: agrega descripción, SKU, código de barras",
            "Opcional: sube una imagen",
            "Guarda el producto",
          ] : [
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
          steps: lang === "es" ? [
            "Los modificadores son opciones adicionales (ej: tamaño, extras)",
            "Ve a Admin → Modificadores",
            "Crea un grupo de modificadores (ej: 'Tamaño')",
            "Agrega opciones al grupo (ej: Pequeño +$0, Grande +$2)",
            "Asigna el grupo a los productos que lo necesiten",
          ] : [
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
          steps: lang === "es" ? [
            "Por defecto tienes 20 mesas numeradas",
            "Ve a POS → Tables para ver todas las mesas",
            "Puedes cambiar el número de mesas en la configuración",
            "Las mesas muestran 'Available' o 'Occupied'",
          ] : [
            "By default you have 20 numbered tables",
            "Go to POS → Tables to see all tables",
            "You can change the number of tables in settings",
            "Tables show 'Available' or 'Occupied'",
          ],
        },
        {
          subtitle: lang === "es" ? "Plano de piso (Floor Plan)" : "Floor Plan",
          steps: lang === "es" ? [
            "Para un layout visual, ve a Admin → Floor Plan",
            "Crea áreas (ej: Salón Principal, Patio, Barra)",
            "Arrastra y coloca mesas en cada área",
            "Asigna números y capacidad a cada mesa",
            "El plano se guarda automáticamente para uso offline",
          ] : [
            "For a visual layout, go to Admin → Floor Plan",
            "Create areas (e.g., Main Salon, Patio, Bar)",
            "Drag and place tables in each area",
            "Assign numbers and capacity to each table",
            "The floor plan is automatically saved for offline use",
          ],
        },
      ],
    },
    {
      id: "taking-orders",
      title: lang === "es" ? "4. Tomar Órdenes" : "4. Taking Orders",
      content: [
        {
          subtitle: lang === "es" ? "Orden de mesa (Dine-in)" : "Table Order (Dine-in)",
          steps: lang === "es" ? [
            "Ve a POS → Tables",
            "Haz clic en una mesa disponible",
            "Se abre el POS con esa mesa seleccionada",
            "Agrega productos al carrito haciendo clic en ellos",
            "Usa el teclado numérico para cambiar cantidades",
            "Haz clic en 'Place order' para guardar el ticket",
          ] : [
            "Go to POS → Tables",
            "Click on an available table",
            "The POS opens with that table selected",
            "Add products to cart by clicking them",
            "Use the number keypad to change quantities",
            "Click 'Place order' to save the ticket",
          ],
        },
        {
          subtitle: lang === "es" ? "Orden para llevar (Takeout)" : "Takeout Order",
          steps: lang === "es" ? [
            "En el POS, cambia el tipo de orden a 'Takeout'",
            "Ingresa el nombre del cliente",
            "Verifica la identificación si es requerido",
            "Agrega productos al carrito",
            "Haz clic en 'Place order'",
          ] : [
            "In the POS, change order type to 'Takeout'",
            "Enter customer name",
            "Verify ID if required",
            "Add products to cart",
            "Click 'Place order'",
          ],
        },
        {
          subtitle: lang === "es" ? "Orden de delivery" : "Delivery Order",
          steps: lang === "es" ? [
            "En el POS, cambia el tipo de orden a 'Delivery'",
            "Ingresa nombre y teléfono del cliente",
            "Ingresa la dirección completa de entrega",
            "Agrega productos al carrito",
            "Haz clic en 'Place order'",
            "El ticket aparecerá en la cola de delivery",
          ] : [
            "In the POS, change order type to 'Delivery'",
            "Enter customer name and phone",
            "Enter full delivery address",
            "Add products to cart",
            "Click 'Place order'",
            "The ticket will appear in the delivery queue",
          ],
        },
      ],
    },
    {
      id: "payments",
      title: lang === "es" ? "5. Cobrar y Cerrar Tickets" : "5. Payments & Closing Tickets",
      content: [
        {
          subtitle: lang === "es" ? "Cobrar un ticket" : "Collect Payment",
          steps: lang === "es" ? [
            "Abre el ticket desde 'Open tickets' o la mesa",
            "Revisa los items y el total",
            "Haz clic en 'Pay' o 'Cobrar'",
            "Selecciona el método de pago (Efectivo, Tarjeta, ATH Móvil)",
            "Para efectivo: ingresa el monto recibido para calcular el cambio",
            "Confirma el pago",
          ] : [
            "Open the ticket from 'Open tickets' or the table",
            "Review items and total",
            "Click 'Pay' or 'Cobrar'",
            "Select payment method (Cash, Card, ATH Móvil)",
            "For cash: enter amount received to calculate change",
            "Confirm payment",
          ],
        },
        {
          subtitle: lang === "es" ? "Imprimir recibo" : "Print Receipt",
          steps: lang === "es" ? [
            "Después de cobrar, aparece la opción de imprimir",
            "Haz clic en 'Print Receipt'",
            "El recibo incluye: items, subtotal, IVU, total, método de pago",
            "También puedes reimprimir desde el historial de órdenes",
          ] : [
            "After payment, the print option appears",
            "Click 'Print Receipt'",
            "Receipt includes: items, subtotal, IVU, total, payment method",
            "You can also reprint from order history",
          ],
        },
        {
          subtitle: lang === "es" ? "Descuentos" : "Discounts",
          steps: lang === "es" ? [
            "Antes de cobrar, puedes aplicar descuentos",
            "Ingresa el monto o porcentaje de descuento",
            "Agrega una razón para el descuento",
            "El descuento se refleja en el total",
          ] : [
            "Before payment, you can apply discounts",
            "Enter discount amount or percentage",
            "Add a reason for the discount",
            "The discount is reflected in the total",
          ],
        },
      ],
    },
    {
      id: "offline-mode",
      title: lang === "es" ? "6. Modo Offline (Huracán)" : "6. Offline Mode (Hurricane)",
      content: [
        {
          subtitle: lang === "es" ? "Cómo funciona" : "How it Works",
          steps: lang === "es" ? [
            "El POS funciona SIN internet",
            "El menú se guarda automáticamente en el dispositivo",
            "Las mesas y el plano de piso también se guardan",
            "Puedes tomar órdenes normalmente cuando no hay conexión",
          ] : [
            "The POS works WITHOUT internet",
            "The menu is automatically saved on the device",
            "Tables and floor plan are also saved",
            "You can take orders normally when there's no connection",
          ],
        },
        {
          subtitle: lang === "es" ? "Tickets offline" : "Offline Tickets",
          steps: lang === "es" ? [
            "Los tickets creados offline se guardan localmente",
            "Aparecen con un indicador 'OFFLINE'",
            "Puedes cobrar tickets offline normalmente",
            "Los tickets se sincronizan cuando vuelve el internet",
          ] : [
            "Tickets created offline are saved locally",
            "They appear with an 'OFFLINE' indicator",
            "You can collect payment on offline tickets normally",
            "Tickets sync when internet returns",
          ],
        },
        {
          subtitle: lang === "es" ? "Sincronización" : "Syncing",
          steps: lang === "es" ? [
            "Cuando vuelve el internet, ve a POS → Offline Queue",
            "Verás todos los tickets pendientes de sincronizar",
            "Haz clic en 'Sync all' para sincronizar todo",
            "O sincroniza tickets individuales con 'Sync'",
            "Los tickets sincronizados aparecen en el historial normal",
          ] : [
            "When internet returns, go to POS → Offline Queue",
            "You'll see all tickets pending sync",
            "Click 'Sync all' to sync everything",
            "Or sync individual tickets with 'Sync'",
            "Synced tickets appear in normal history",
          ],
        },
      ],
    },
    {
      id: "reports",
      title: lang === "es" ? "7. Reportes y Resumen" : "7. Reports & Summary",
      content: [
        {
          subtitle: lang === "es" ? "Resumen de ventas" : "Sales Summary",
          steps: lang === "es" ? [
            "En el POS, el resumen de ventas aparece arriba",
            "Muestra: ventas del día, tickets abiertos, promedio",
            "Puedes filtrar por: Hoy, 7 días, 30 días",
          ] : [
            "In the POS, sales summary appears at the top",
            "Shows: today's sales, open tickets, average",
            "You can filter by: Today, 7 days, 30 days",
          ],
        },
        {
          subtitle: lang === "es" ? "Historial de órdenes" : "Order History",
          steps: lang === "es" ? [
            "Ve a Admin → Orders para ver el historial completo",
            "Filtra por estado: Abierto, Pagado, Cancelado",
            "Filtra por fecha",
            "Haz clic en una orden para ver detalles",
          ] : [
            "Go to Admin → Orders to see full history",
            "Filter by status: Open, Paid, Cancelled",
            "Filter by date",
            "Click an order to see details",
          ],
        },
      ],
    },
    {
      id: "users",
      title: lang === "es" ? "8. Usuarios y Permisos" : "8. Users & Permissions",
      content: [
        {
          subtitle: lang === "es" ? "Agregar usuarios" : "Add Users",
          steps: lang === "es" ? [
            "Ve a Admin → Users",
            "Haz clic en 'Invite User'",
            "Ingresa el email del nuevo usuario",
            "Selecciona el rol: Admin, Manager, Cashier",
            "El usuario recibirá un email de invitación",
          ] : [
            "Go to Admin → Users",
            "Click 'Invite User'",
            "Enter the new user's email",
            "Select role: Admin, Manager, Cashier",
            "User will receive an invitation email",
          ],
        },
        {
          subtitle: lang === "es" ? "Roles" : "Roles",
          steps: lang === "es" ? [
            "Admin: acceso completo a todo",
            "Manager: puede ver reportes y manejar órdenes",
            "Cashier: solo puede usar el POS y cobrar",
          ] : [
            "Admin: full access to everything",
            "Manager: can view reports and manage orders",
            "Cashier: can only use POS and collect payments",
          ],
        },
      ],
    },
    {
      id: "tips",
      title: lang === "es" ? "9. Tips y Mejores Prácticas" : "9. Tips & Best Practices",
      content: [
        {
          subtitle: lang === "es" ? "Antes de abrir" : "Before Opening",
          steps: lang === "es" ? [
            "Verifica que el menú esté actualizado",
            "Abre el POS una vez con internet para cachear el menú",
            "Revisa que todas las mesas estén disponibles",
            "Sincroniza cualquier ticket offline pendiente",
          ] : [
            "Verify the menu is up to date",
            "Open the POS once with internet to cache the menu",
            "Check that all tables are available",
            "Sync any pending offline tickets",
          ],
        },
        {
          subtitle: lang === "es" ? "Durante el servicio" : "During Service",
          steps: lang === "es" ? [
            "Usa búsqueda rápida para encontrar productos",
            "Usa el teclado numérico para cantidades grandes",
            "Revisa 'Open tickets' regularmente",
            "Si se va el internet, sigue trabajando normalmente",
          ] : [
            "Use quick search to find products",
            "Use the number keypad for large quantities",
            "Check 'Open tickets' regularly",
            "If internet goes out, keep working normally",
          ],
        },
        {
          subtitle: lang === "es" ? "Al cerrar" : "At Closing",
          steps: lang === "es" ? [
            "Cierra todos los tickets abiertos",
            "Sincroniza tickets offline si hay pendientes",
            "Revisa el resumen de ventas del día",
            "Exporta reportes si es necesario",
          ] : [
            "Close all open tickets",
            "Sync offline tickets if any pending",
            "Review the day's sales summary",
            "Export reports if needed",
          ],
        },
      ],
    },
  ];

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="relative mx-auto w-full max-w-4xl px-6 py-10">
        <MarketingHeader ctaVariant="signin" />

        <main className="mt-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold sm:text-4xl">
              {lang === "es" ? "Manual de Entrenamiento" : "Training Manual"}
            </h1>
            <p className="mt-3 text-[var(--mp-muted)]">
              {lang === "es"
                ? "Guía completa para usar IslaPOS en tu restaurante"
                : "Complete guide to using IslaPOS in your restaurant"}
            </p>
          </div>

          {/* Table of Contents */}
          <div className="mt-10 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6">
            <h2 className="text-lg font-semibold">
              {lang === "es" ? "Contenido" : "Table of Contents"}
            </h2>
            <nav className="mt-4 grid gap-2 sm:grid-cols-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--mp-primary)]/10"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="mt-10 space-y-12">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                <div className="mt-6 space-y-8">
                  {section.content.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6"
                    >
                      <h3 className="text-lg font-semibold">{item.subtitle}</h3>
                      <ol className="mt-4 space-y-3">
                        {item.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex gap-3 text-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--mp-primary)] text-xs font-medium text-white">
                              {stepIdx + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Help CTA */}
          <div className="mt-16 rounded-2xl bg-[var(--mp-primary)] p-8 text-center text-white">
            <h2 className="text-xl font-bold">
              {lang === "es" ? "¿Necesitas ayuda?" : "Need help?"}
            </h2>
            <p className="mt-2 text-sm opacity-90">
              {lang === "es"
                ? "Contáctanos para una sesión de entrenamiento personalizada."
                : "Contact us for a personalized training session."}
            </p>
            <a
              href="/contact"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-[var(--mp-primary)] hover:bg-white/90"
            >
              {lang === "es" ? "Contactar soporte" : "Contact support"}
            </a>
          </div>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
