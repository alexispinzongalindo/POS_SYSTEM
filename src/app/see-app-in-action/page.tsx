"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useMarketingLang } from "@/lib/useMarketingLang";

type Slide = {
  id: string;
  img: string;
  title: { en: string; es: string };
  body: { en: string; es: string };
};

function pickPreferredVoice(lang: "en" | "es") {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices.length) return null;

  const langPrefix = lang === "es" ? "es" : "en";
  const preferred = voices.find(
    (v) => v.lang?.toLowerCase().startsWith(langPrefix) && /female|woman|girl|samantha|karen|victoria/i.test(v.name),
  );
  if (preferred) return preferred;

  const matchLang = voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix));
  return matchLang ?? voices[0] ?? null;
}

export default function SeeAppInActionPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const langKey: "en" | "es" = lang === "es" ? "es" : "en";

  const slides: Slide[] = useMemo(
    () => [
      {
        id: "intro",
        img: "/tutorial-frames/frame-012.jpg",
        title: { en: "See IslaPOS in Action", es: "Mira IslaPOS en acción" },
        body: {
          en: "This is a guided, hands-free tour. Use Play to auto-advance, and enable Voice for narration.",
          es: "Este es un tour guiado, sin tener que grabar. Usa Play para avanzar automático y activa Voz para narración.",
        },
      },
      {
        id: "login",
        img: "/tutorial-frames/frame-014.jpg",
        title: { en: "Login", es: "Iniciar sesión" },
        body: {
          en: "Start by logging in with your email and password. Owners and managers will see the Admin dashboard.",
          es: "Comienza iniciando sesión con tu email y contraseña. Dueños y managers verán el panel de Admin.",
        },
      },
      {
        id: "setup",
        img: "/tutorial-frames/frame-020.jpg",
        title: { en: "Initial Setup", es: "Configuración inicial" },
        body: {
          en: "Enter your restaurant details: name, phone, and other business settings. This takes just a few minutes.",
          es: "Entra los detalles del restaurante: nombre, teléfono y ajustes del negocio. Esto toma solo minutos.",
        },
      },
      {
        id: "admin-dashboard",
        img: "/tutorial-frames/frame-023.jpg",
        title: { en: "Admin Dashboard", es: "Panel de Admin" },
        body: {
          en: "From Admin you manage your restaurant: menu setup, staff, reports, and integrations.",
          es: "Desde Admin manejas tu restaurante: menú, empleados, reportes e integraciones.",
        },
      },
      {
        id: "business-info",
        img: "/tutorial-frames/frame-030.jpg",
        title: { en: "Business Information", es: "Información del negocio" },
        body: {
          en: "Update your restaurant profile like address, timezone, and logo. These settings affect receipts and reports.",
          es: "Actualiza el perfil del restaurante: dirección, zona horaria y logo. Estos ajustes impactan recibos y reportes.",
        },
      },
      {
        id: "setup-cards",
        img: "/tutorial-frames/frame-040.jpg",
        title: { en: "Setup Checklist", es: "Checklist de setup" },
        body: {
          en: "Use the setup cards to complete the essentials: menu, POS, and ordering.",
          es: "Usa las tarjetas de setup para completar lo esencial: menú, POS y órdenes.",
        },
      },
      {
        id: "create-category",
        img: "/tutorial-frames/frame-050.jpg",
        title: { en: "Create Categories", es: "Crear categorías" },
        body: {
          en: "Create menu categories first. This keeps your POS fast and easy for staff.",
          es: "Crea categorías primero. Esto hace el POS más rápido y fácil para los empleados.",
        },
      },
      {
        id: "create-item",
        img: "/tutorial-frames/frame-045.jpg",
        title: { en: "Add Items", es: "Agregar productos" },
        body: {
          en: "Add items with prices and optional photos. You can keep it simple and improve later.",
          es: "Agrega productos con precio y fotos opcionales. Puedes empezar simple y mejorar luego.",
        },
      },
      {
        id: "categories-list",
        img: "/tutorial-frames/frame-060.jpg",
        title: { en: "Menu Structure", es: "Estructura del menú" },
        body: {
          en: "Once categories and items are set, your POS menu is ready for day-to-day use.",
          es: "Cuando categorías y productos estén listos, el menú del POS queda listo para el día a día.",
        },
      },
      {
        id: "wrap-up",
        img: "/tutorial-frames/frame-001.jpg",
        title: { en: "Next steps", es: "Próximos pasos" },
        body: {
          en: "Next: connect your Edge Gateway for printing, and set up KDS if you want kitchen screens.",
          es: "Luego: conecta el Edge Gateway para imprimir, y configura KDS si quieres pantallas en cocina.",
        },
      },
    ],
    [],
  );

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);

  const slide = slides[Math.min(Math.max(0, index), slides.length - 1)];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    const onVoices = () => setVoiceReady(true);
    onVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => synth.removeEventListener?.("voiceschanged", onVoices);
  }, []);

  function speakCurrent() {
    if (typeof window === "undefined") return;
    if (!voiceEnabled) return;
    if (!voiceReady) return;

    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const text = `${slide.title[langKey]}. ${slide.body[langKey]}`;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langKey === "es" ? "es-PR" : "en-US";
      const v = pickPreferredVoice(langKey);
      if (v) u.voice = v;
      u.rate = 1;
      u.pitch = 1.05;
      synth.speak(u);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    speakCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, langKey, voiceEnabled, voiceReady]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= slides.length) return i;
        return next;
      });
    }, 6500);
    return () => window.clearTimeout(t);
  }, [playing, slides.length, index]);

  const atStart = index === 0;
  const atEnd = index >= slides.length - 1;

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{langKey === "es" ? "Ver app en acción" : "See App in Action"}</h1>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              {langKey === "es"
                ? "Tour tipo slideshow con voz. No necesitas grabar nada."
                : "A slideshow-style tour with voice. No recording required."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
            >
              {langKey === "es" ? "Volver" : "Back"}
            </button>

            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-xs font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
            >
              {playing ? (langKey === "es" ? "Pausar" : "Pause") : langKey === "es" ? "Play" : "Play"}
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  window.speechSynthesis?.cancel?.();
                } catch {
                  // ignore
                }
                setVoiceEnabled((v) => !v);
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
            >
              {voiceEnabled ? (langKey === "es" ? "Voz: ON" : "Voice: ON") : langKey === "es" ? "Voz: OFF" : "Voice: OFF"}
            </button>

            <button
              type="button"
              onClick={speakCurrent}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
            >
              {langKey === "es" ? "Repetir" : "Replay"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-white shadow-sm">
            <div className="aspect-[16/9] w-full bg-zinc-100">
              <img src={slide.img} alt={slide.title[langKey]} className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mp-border)] px-5 py-4">
              <div className="text-xs text-[var(--mp-muted)]">
                {langKey === "es" ? "Slide" : "Slide"} {index + 1}/{slides.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={atStart}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60"
                >
                  {langKey === "es" ? "Anterior" : "Prev"}
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={atEnd}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-xs font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                >
                  {langKey === "es" ? "Siguiente" : "Next"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">{slide.title[langKey]}</div>
            <div className="mt-2 whitespace-pre-line text-sm text-[var(--mp-muted)]">{slide.body[langKey]}</div>

            <div className="mt-5 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-bg)] px-4 py-3 text-xs text-[var(--mp-muted)]">
              {langKey === "es"
                ? "Si ves algún slide feo (negro o con error), dímelo y lo saco del tour."
                : "If you see any bad slide (black or error), tell me and I will remove it from the tour."}
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setPlaying(true);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
              >
                {langKey === "es" ? "Reiniciar tour" : "Restart tour"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIndex(slides.length - 1);
                  setPlaying(false);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
              >
                {langKey === "es" ? "Ir al final" : "Jump to end"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--mp-muted)]">
          {langKey === "es"
            ? "Tip: para una voz femenina mejor, usa Safari/Chrome (no modo privado)."
            : "Tip: for better female voices, use Safari/Chrome (not private browsing)."}
        </div>
      </div>
    </div>
  );
}
