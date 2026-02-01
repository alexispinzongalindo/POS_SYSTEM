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
    const padded = (n: number) => String(n).padStart(3, "0");

    const captions: Array<{ n: number; en: string; es: string }> = [
      { n: 1, en: "Welcome to IslaPOS.", es: "Bienvenido a IslaPOS." },
      { n: 5, en: "Dashboard overview.", es: "Resumen del panel." },
      { n: 10, en: "Menu & products.", es: "Menú y productos." },
      { n: 16, en: "Tables and floor plan.", es: "Mesas y plano de piso." },
      { n: 22, en: "Taking orders in POS.", es: "Tomando órdenes en el POS." },
      { n: 28, en: "Open tickets and quick resume.", es: "Tickets abiertos y regresar rápido." },
      { n: 34, en: "Payments and receipts.", es: "Cobro y recibos." },
      { n: 40, en: "Offline (Hurricane Mode) and sync.", es: "Modo offline (Huracán) y sincronización." },
    ];

    const captionMap = new Map<number, { en: string; es: string }>(captions.map((c) => [c.n, { en: c.en, es: c.es }]));

    const frames = Array.from({ length: 44 }, (_, i) => i + 1);
    return frames.map((n) => {
      const cap = captionMap.get(n) ?? {
        en: "Feature walkthrough.",
        es: "Recorrido de funciones.",
      };
      return {
        src: `/tutorial-frames/frame-${padded(n)}.jpg`,
        caption: cap,
      };
    });
  }, []);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);

  const current = slides[index];

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 2000);
    return () => window.clearInterval(t);
  }, [playing, slides.length]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const onVoices = () => setVoiceReady(true);
    onVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => synth.removeEventListener?.("voiceschanged", onVoices);
  }, []);

  function speak() {
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
    speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lang, voiceEnabled, voiceReady]);

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
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-black/[0.03]"
          >
            {playing ? (lang === "es" ? "Pausar" : "Pause") : lang === "es" ? "Reproducir" : "Play"}
          </button>

          <button
            type="button"
            onClick={() => {
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
            onClick={speak}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-black/[0.03]"
          >
            {lang === "es" ? "Hablar" : "Speak"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--mp-border)] bg-white/60">
        <img src={current.src} alt={current.caption[lang]} className="h-[360px] w-full object-contain bg-black/[0.04]" />
      </div>

      <div className="mt-3 text-sm text-[var(--mp-muted)]">{current.caption[lang]}</div>

      <input
        className="mt-4 w-full"
        type="range"
        min={0}
        max={slides.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
      />
    </div>
  );
}
