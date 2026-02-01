"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useMarketingLang } from "@/lib/useMarketingLang";

export type TourStep = {
  id: string;
  title: { en: string; es: string };
  body: { en: string; es: string };
  href: string;
  target?: string;
};

type TourState = {
  active: boolean;
  index: number;
  voiceEnabled: boolean;
};

const STORAGE_KEY = "islapos_spotlight_tour_v1";

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

function readState(stepsLen: number): TourState {
  if (typeof window === "undefined") return { active: false, index: 0, voiceEnabled: true };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: false, index: 0, voiceEnabled: true };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    const idx = typeof parsed.index === "number" ? parsed.index : 0;
    return {
      active: !!parsed.active,
      index: Math.min(Math.max(0, idx), Math.max(0, stepsLen - 1)),
      voiceEnabled: parsed.voiceEnabled ?? true,
    };
  } catch {
    return { active: false, index: 0, voiceEnabled: true };
  }
}

function writeState(state: TourState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function startTour() {
  writeState({ active: true, index: 0, voiceEnabled: true });
}

function stopTour() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function getRectForTarget(target?: string) {
  if (!target) return null;
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour="${CSS.escape(target)}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!Number.isFinite(r.left) || !Number.isFinite(r.top)) return null;
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

export default function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useMarketingLang();
  const langKey: "en" | "es" = lang === "es" ? "es" : "en";

  const steps: TourStep[] = useMemo(
    () => [
      {
        id: "login",
        title: { en: "Login", es: "Iniciar sesión" },
        body: {
          en: "Sign in to access your restaurant.",
          es: "Inicia sesión para entrar a tu restaurante.",
        },
        href: "/login?mode=signin",
        target: "login.submit",
      },
      {
        id: "tables",
        title: { en: "Tables", es: "Mesas" },
        body: {
          en: "Tap Tables to manage dine-in tickets by table.",
          es: "Toca Mesas para manejar tickets por mesa.",
        },
        href: "/pos",
        target: "pos.tables",
      },
      {
        id: "openTickets",
        title: { en: "Open tickets", es: "Tickets abiertos" },
        body: {
          en: "Use Open tickets to resume any order in seconds.",
          es: "Usa Tickets abiertos para regresar a una orden en segundos.",
        },
        href: "/pos",
        target: "pos.openTickets",
      },
      {
        id: "placeOrder",
        title: { en: "Place order", es: "Guardar ticket" },
        body: {
          en: "After adding items, tap Place order to save the ticket.",
          es: "Después de agregar productos, toca Guardar ticket.",
        },
        href: "/pos",
        target: "pos.placeOrder",
      },
      {
        id: "offline",
        title: { en: "Offline Queue", es: "Cola Offline" },
        body: {
          en: "If internet goes down, tickets save locally. Sync them here when connection returns.",
          es: "Si se va el internet, los tickets se guardan localmente. Sincroniza aquí cuando regrese.",
        },
        href: "/pos",
        target: "pos.offlineBanner",
      },
      {
        id: "done",
        title: { en: "You're ready", es: "Listo" },
        body: {
          en: "Open Training any time for the full manual.",
          es: "Abre Entrenamiento cuando quieras para el manual completo.",
        },
        href: "/training",
        target: "training.toc",
      },
    ],
    [],
  );

  const [state, setState] = useState<TourState>(() => readState(steps.length));
  const [rect, setRect] = useState<ReturnType<typeof getRectForTarget> | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);

  const step = steps[Math.min(Math.max(0, state.index), steps.length - 1)];

  useEffect(() => {
    // keep state in sync if another tab updates localStorage
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setState(readState(steps.length));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [steps.length]);

  useEffect(() => {
    writeState(state);
  }, [state]);

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
    if (!state.voiceEnabled) return;
    if (!voiceReady) return;

    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const text = `${step.title[langKey]}. ${step.body[langKey]}`;
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

  function recomputeRect() {
    if (!state.active) {
      setRect(null);
      return;
    }
    // defer until DOM is painted
    window.requestAnimationFrame(() => {
      setRect(getRectForTarget(step.target));
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.active) return;

    recomputeRect();
    const onResize = () => recomputeRect();
    const onScroll = () => recomputeRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.index, pathname, step.target]);

  useEffect(() => {
    if (!state.active) return;
    if (!voiceReady) return;
    speakCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.index, langKey, voiceReady]);

  useEffect(() => {
    if (!state.active) return;

    // Navigate to the step route when tour is active
    const targetPath = step.href.split("?")[0];
    if (pathname !== targetPath) {
      router.push(step.href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.index]);

  const padding = 10;
  const spot = rect
    ? {
        left: Math.max(8, rect.left - padding),
        top: Math.max(8, rect.top - padding),
        right: Math.min(window.innerWidth - 8, rect.right + padding),
        bottom: Math.min(window.innerHeight - 8, rect.bottom + padding),
      }
    : null;

  const showOverlay = state.active;

  return (
    <>
      {children}

      {showOverlay ? (
        <div className="fixed inset-0 z-[9999]">
          {/* Dim overlays around spotlight */}
          {spot ? (
            <>
              <div className="absolute left-0 top-0 w-full bg-black/45" style={{ height: spot.top }} />
              <div
                className="absolute left-0 bg-black/45"
                style={{ top: spot.top, height: spot.bottom - spot.top, width: spot.left }}
              />
              <div
                className="absolute right-0 bg-black/45"
                style={{ top: spot.top, height: spot.bottom - spot.top, width: window.innerWidth - spot.right }}
              />
              <div className="absolute left-0 bottom-0 w-full bg-black/45" style={{ top: spot.bottom }} />

              {/* Spotlight outline */}
              <div
                className="absolute rounded-xl border-2 border-[var(--mp-primary)] shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]"
                style={{ left: spot.left, top: spot.top, width: spot.right - spot.left, height: spot.bottom - spot.top }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/45" />
          )}

          {/* Floating panel */}
          <div className="absolute left-1/2 top-6 w-[min(720px,calc(100vw-24px))] -translate-x-1/2">
            <div className="rounded-2xl border border-[var(--mp-border)] bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  {langKey === "es" ? "Versión de entrenamiento" : "Training version"}: 2026-02-01
                </div>
                <div className="text-xs text-zinc-500">
                  {langKey === "es" ? "Paso" : "Step"} {state.index + 1}/{steps.length}
                </div>
              </div>

              <div className="mt-2">
                <div className="text-base font-semibold text-zinc-900">{step.title[langKey]}</div>
                <div className="mt-1 text-sm text-zinc-700">{step.body[langKey]}</div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={state.voiceEnabled}
                      onChange={(e) => setState((s) => ({ ...s, voiceEnabled: e.target.checked }))}
                    />
                    {langKey === "es" ? "Voz" : "Voice"}
                  </label>

                  <button
                    type="button"
                    onClick={speakCurrent}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                  >
                    {langKey === "es" ? "Hablar" : "Speak"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopTour();
                      setState({ active: false, index: 0, voiceEnabled: true });
                      router.push("/training");
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                  >
                    {langKey === "es" ? "Finalizar" : "Finish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopTour();
                      setState({ active: false, index: 0, voiceEnabled: true });
                      router.push("/training");
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                  >
                    {langKey === "es" ? "Saltar" : "Skip"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, index: Math.max(0, s.index - 1) }))}
                  disabled={state.index === 0}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium hover:bg-zinc-50 disabled:opacity-60"
                >
                  {langKey === "es" ? "Anterior" : "Prev"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = state.index + 1;
                    if (next >= steps.length) {
                      stopTour();
                      setState({ active: false, index: 0, voiceEnabled: true });
                      router.push("/training");
                      return;
                    }
                    setState((s) => ({ ...s, index: next }));
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-xs font-semibold text-white hover:opacity-90"
                >
                  {langKey === "es" ? "Siguiente" : "Next"}
                </button>
              </div>
            </div>

            <div className="mt-2 text-center text-xs text-white/90">
              {langKey === "es"
                ? "Usa los botones para continuar (no necesitas teclado)."
                : "Use the buttons to continue (no keyboard required)."}
            </div>
          </div>
        </div>
      ) : null}

      {/* hidden starter for /tour */}
      <TourStarter onStart={() => {
        startTour();
        setState(readState(steps.length));
        router.push("/login?mode=signin");
      }} />
    </>
  );
}

function TourStarter({ onStart }: { onStart: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/tour") return;
    onStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}
