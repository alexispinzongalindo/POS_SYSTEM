"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useMarketingLang } from "@/lib/useMarketingLang";

type Slide = {
  id: string;
  img: string;
  title: { en: string; es: string };
  body: { en: string; es: string };
  duration_sec?: number;
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

export default function AdminTrainingSlidesPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const langKey: "en" | "es" = lang === "es" ? "es" : "en";

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slidesLoaded, setSlidesLoaded] = useState(false);
  const slidesUrl = useMemo(() => `/islapos-training/${langKey}/slides.json`, [langKey]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const slide = slides.length ? slides[Math.min(Math.max(0, index), slides.length - 1)] : null;
  const slideSrc = slide ? `${slide.img}?v=20260208` : "";

  useEffect(() => {
    let cancelled = false;
    setSlidesLoaded(false);

    fetch(slidesUrl, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? (data as Slide[]) : [];
        setSlides(arr);
        setIndex(0);
        setPlaying(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSlides([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSlidesLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slidesUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    const onVoices = () => setVoiceReady(true);
    onVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => synth.removeEventListener?.("voiceschanged", onVoices);
  }, []);

  function speakCurrent(onEnd?: () => void) {
    if (typeof window === "undefined") return;
    if (!voiceEnabled) return;
    if (!voiceReady) return;
    if (!slide) return;

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
      u.onend = () => {
        if (onEnd) onEnd();
      };
      synth.speak(u);
      speechRef.current = u;
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!playing || !slides.length || !slide) return;

    const advance = () => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= slides.length) {
          setPlaying(false);
          return i;
        }
        return next;
      });
    };

    if (voiceEnabled && voiceReady) {
      speakCurrent(advance);
      return () => {
        try {
          window.speechSynthesis?.cancel?.();
        } catch {
          // ignore
        }
      };
    }

    const fallbackSeconds = slide.duration_sec && Number(slide.duration_sec) > 0 ? Number(slide.duration_sec) : 10;
    const t = window.setTimeout(advance, Math.round(fallbackSeconds * 1000));
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, langKey, voiceEnabled, voiceReady, playing, slides.length]);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const atStart = index === 0;
  const atEnd = index >= slides.length - 1;

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{langKey === "es" ? "Entrenamiento" : "Training"}</h1>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              {langKey === "es"
                ? "Slideshow guiado con voz para todo el sistema."
                : "Voice-guided slideshow that covers the full system."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/training")}
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
              onClick={() => speakCurrent()}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
            >
              {langKey === "es" ? "Repetir" : "Replay"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-white shadow-sm">
            <div className="aspect-[16/9] w-full bg-zinc-100">
              {slide ? (
                <img src={slideSrc} alt={slide.title[langKey]} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm text-[var(--mp-muted)]">
                  {!slidesLoaded
                    ? langKey === "es"
                      ? "Cargando entrenamiento..."
                      : "Loading training..."
                    : langKey === "es"
                      ? "No hay slides configurados todavía."
                      : "No slides configured yet."}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mp-border)] px-5 py-4">
              <div className="text-xs text-[var(--mp-muted)]">
                {langKey === "es" ? "Slide" : "Slide"} {slides.length ? index + 1 : 0}/{slides.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={atStart || !slides.length}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-60"
                >
                  {langKey === "es" ? "Anterior" : "Prev"}
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={atEnd || !slides.length}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-xs font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                >
                  {langKey === "es" ? "Siguiente" : "Next"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">
              {slide ? slide.title[langKey] : langKey === "es" ? "Entrenamiento" : "Training"}
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-[var(--mp-muted)]">
              {slide
                ? slide.body[langKey]
                : langKey === "es"
                  ? "Esta vista cubre todas las áreas principales de IslaPOS para onboarding del equipo."
                  : "This view covers all key IslaPOS areas for team onboarding."}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-bg)] px-4 py-3 text-xs text-[var(--mp-muted)]">
              {langKey === "es"
                ? "Si ves una pantalla incorrecta, me dices y la reemplazo."
                : "If you see an incorrect screen, tell me and I will replace it."}
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setPlaying(true);
                }}
                disabled={!slides.length}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
              >
                {langKey === "es" ? "Reiniciar" : "Restart"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIndex(slides.length - 1);
                  setPlaying(false);
                }}
                disabled={!slides.length}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-zinc-50"
              >
                {langKey === "es" ? "Ir al final" : "Jump to end"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--mp-muted)]">
          {langKey === "es"
            ? "Tip: para mejor voz, usa Safari o Chrome fuera de modo privado."
            : "Tip: for better voice quality, use Safari or Chrome outside private mode."}
        </div>
      </div>
    </div>
  );
}
