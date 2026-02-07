"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import { useMarketingLang } from "@/lib/useMarketingLang";

type Restaurant = {
  id: string;
  name: string;
};

export default function QRMenuPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Menú con código QR" : "QR Code Menu",
    subtitle: isEs ? "Genera códigos QR para que tus clientes vean el menú" : "Generate QR codes for customers to view your menu",
    back: isEs ? "← Volver" : "← Back",
    noRestaurant: isEs ? "No hay restaurante seleccionado" : "No restaurant selected",
    restaurantNotFound: isEs ? "Restaurante no encontrado" : "Restaurant not found",
    qrFailed: isEs ? "No se pudo generar el código QR" : "Failed to generate QR code",
    scanToView: isEs ? "Escanea para ver el menú" : "Scan to view menu",
    menuUrl: isEs ? "URL del menú" : "Menu URL",
    copy: isEs ? "Copiar" : "Copy",
    download: isEs ? "Descargar PNG" : "Download PNG",
    print: isEs ? "Imprimir" : "Print",
    preview: isEs ? "Ver página del menú →" : "Preview menu page →",
    howToUse: isEs ? "Cómo usarlo" : "How to use",
    step1: isEs ? "Descarga o imprime el código QR de arriba" : "Download or print the QR code above",
    step2: isEs ? "Colócalo en mesas, en la entrada o en tu material de marketing" : "Place it on tables, at the entrance, or on your marketing materials",
    step3: isEs ? "Los clientes escanean con la cámara del teléfono para ver el menú al instante" : "Customers scan with their phone camera to view your menu instantly",
    notSignedIn: isEs ? "No has iniciado sesión" : "Not signed in",
    qrTitle: isEs ? "Menú QR" : "QR Menu",
    poweredBy: isEs ? "Impulsado por IslaPOS" : "Powered by IslaPOS",
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      const restaurantId = cfg.data.restaurant_id;
      if (!restaurantId) {
        setError(t.noRestaurant);
        setLoading(false);
        return;
      }

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("id", restaurantId)
        .maybeSingle<Restaurant>();

      if (cancelled) return;

      if (restaurantError) {
        setError(restaurantError.message);
        setLoading(false);
        return;
      }

      if (!restaurantData) {
        setError(t.restaurantNotFound);
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      // Generate menu URL
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${baseUrl}/menu/${restaurantData.id}`;
      setMenuUrl(url);

      // Generate QR code
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (qrErr) {
        setError(qrErr instanceof Error ? qrErr.message : t.qrFailed);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function downloadQR() {
    if (!qrDataUrl || !restaurant) return;

    const link = document.createElement("a");
    link.download = `${restaurant.name.replace(/[^a-zA-Z0-9]/g, "_")}_menu_qr.png`;
    link.href = qrDataUrl;
    link.click();
  }

  function printQR() {
    if (!qrDataUrl || !restaurant) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t.qrTitle} - ${restaurant.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
            }
            p {
              font-size: 14px;
              color: #666;
              margin-bottom: 24px;
            }
            img {
              width: 300px;
              height: 300px;
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${restaurant.name}</h1>
            <p>${t.scanToView}</p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="footer">${t.poweredBy}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mp-bg)] flex items-center justify-center">
        <div className="text-[var(--mp-muted)]">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-sm text-[var(--mp-muted)]">
              {t.subtitle}
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-medium hover:bg-zinc-50"
          >
            {t.back}
          </a>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {restaurant && qrDataUrl ? (
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center">
              {/* Restaurant name */}
              <h2 className="text-xl font-semibold">{restaurant.name}</h2>
              <p className="mt-1 text-sm text-[var(--mp-muted)]">{t.scanToView}</p>

              {/* QR Code */}
              <div className="mt-6 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <img
                  src={qrDataUrl}
                  alt="Menu QR Code"
                  className="h-64 w-64"
                />
              </div>

              {/* Menu URL */}
              <div className="mt-6 w-full">
                <label className="text-sm font-medium text-[var(--mp-muted)]">{t.menuUrl}</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={menuUrl}
                    className="h-11 flex-1 rounded-xl border border-[var(--mp-border)] bg-zinc-50 px-4 text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(menuUrl);
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-medium hover:bg-zinc-50"
                  >
                    {t.copy}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={downloadQR}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-6 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t.download}
                </button>
                <button
                  onClick={printQR}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-6 text-sm font-semibold hover:bg-zinc-50"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {t.print}
                </button>
              </div>

              {/* Preview link */}
              <div className="mt-6">
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--mp-primary)] hover:underline"
                >
                  {t.preview}
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* Instructions */}
        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold">{t.howToUse}</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--mp-muted)]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--mp-primary)] text-xs font-semibold text-white">1</span>
              <span>{t.step1}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--mp-primary)] text-xs font-semibold text-white">2</span>
              <span>{t.step2}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--mp-primary)] text-xs font-semibold text-white">3</span>
              <span>{t.step3}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
