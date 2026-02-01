"use client";

import { useEffect, useMemo, useState } from "react";

type Slide = {
  src: string;
  caption: { en: string; es: string };
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

export default function MarketingDemoSlideshow({ lang }: { lang: "en" | "es" }) {
  const slides: Slide[] = useMemo(() => {
    // IMPORTANT: Use only IslaPOS-owned assets. Do NOT use 3rd-party screenshots.
    // To show real UI screens here, add your own screenshots under:
    // - public/demo/01-login.png
    // - public/demo/02-pos.png
    // - public/demo/03-tables.png
    // - public/demo/04-offline.png
    // - public/demo/05-reports.png
    // (PNG/JPG is fine; keep the same filenames and extensions you choose.)
    //
    // Fallback uses the existing POS preview image so nothing "stock" shows.
    return [
      {
        src: "/demo/01-login.png",
        caption: { en: "Login and start your shift.", es: "Inicia sesión y comienza tu turno." },
      },
      {
        src: "/demo/02-pos.png",
        caption: { en: "POS: add items and place an order.", es: "POS: agrega productos y guarda el ticket." },
      },
      {
        src: "/demo/03-tables.png",
        caption: { en: "Tables: manage dine-in by table.", es: "Mesas: maneja salón por mesa." },
      },
      {
        src: "/demo/04-offline.png",
        caption: { en: "Offline (Hurricane Mode) and sync.", es: "Modo offline (Huracán) y sincronización." },
      },
      {
        src: "/demo/05-reports.png",
        caption: { en: "Reports and history.", es: "Reportes e historial." },
      },
      {
        src: "/hero/PART2.png",
        caption: {
          en: "Preview: fast POS workflow.",
          es: "Vista previa: flujo rápido del POS.",
        },
      },
    ];
  }, []);

  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);

  const current = slides[index];

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 10000);
    return () => window.clearInterval(t);
  }, [playing, slides.length]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const onVoices = () => setVoiceReady(true);
    onVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => synth.removeEventListener?.("voiceschanged", onVoices);
  }, []);

  function speak(force = false) {
    if (!started && !force) return;
    if (!voiceEnabled) return;
    if (!voiceReady) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(current.caption[lang]);
      u.lang = lang === "es" ? "es-PR" : "en-US";
      const v = pickPreferredVoice(lang);
      if (v) u.voice = v;
      u.rate = 1;
      u.pitch = 1.05;
      synth.speak(u);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    speak(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lang, voiceEnabled, voiceReady, started]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{lang === "es" ? "Demo interactivo" : "Interactive demo"}</div>
          <div className="mt-1 text-xs text-[var(--mp-muted)]">
            {lang === "es" ? "Paso" : "Step"} {index + 1}/{slides.length}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!started) {
                setStarted(true);
                setPlaying(true);
                speak(true);
                return;
              }
              setPlaying((p) => !p);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-black/[0.03]"
          >
            {!started
              ? lang === "es"
                ? "Iniciar"
                : "Start"
              : playing
                ? lang === "es"
                  ? "Pausar"
                  : "Pause"
                : lang === "es"
                  ? "Reproducir"
                  : "Play"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStarted(true);
              setPlaying(false);
              setIndex((i) => (i - 1 + slides.length) % slides.length);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-black/[0.03]"
          >
            {lang === "es" ? "Anterior" : "Prev"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStarted(true);
              setPlaying(false);
              setIndex((i) => (i + 1) % slides.length);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-3 text-xs font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
          >
            {lang === "es" ? "Siguiente" : "Next"}
          </button>

          <label className="ml-1 inline-flex items-center gap-2 text-xs text-[var(--mp-muted)]">
            <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
            {lang === "es" ? "Voz" : "Voice"}
          </label>

          <button
            type="button"
            onClick={() => speak(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-black/[0.03]"
          >
            {lang === "es" ? "Hablar" : "Speak"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--mp-border)] bg-white/60">
        <img
          src={current.src}
          alt={current.caption[lang]}
          className="h-[360px] w-full object-contain bg-black/[0.04]"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallbackApplied === "1") return;
            el.dataset.fallbackApplied = "1";
            el.src = "/hero/PART2.png";
          }}
        />
      </div>

      <div className="mt-3 text-sm text-[var(--mp-muted)]">{current.caption[lang]}</div>

      <input
        className="mt-4 w-full"
        type="range"
        min={0}
        max={slides.length - 1}
        value={index}
        onChange={(e) => {
          setStarted(true);
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
      />
    </div>
  );
}
