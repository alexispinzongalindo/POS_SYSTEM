"use client";

import { useEffect } from "react";

import { useMarketingLang } from "@/lib/useMarketingLang";

export default function GlobalLangToggle() {
  const { lang, setLang } = useMarketingLang();

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="fixed right-4 top-4 z-[60]">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mp-border)] bg-white/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
            lang === "en"
              ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
              : "text-[var(--mp-muted)] hover:bg-black/[0.04]"
          }`}
          aria-label="English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("es")}
          className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
            lang === "es"
              ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
              : "text-[var(--mp-muted)] hover:bg-black/[0.04]"
          }`}
          aria-label="Español"
        >
          ES
        </button>
      </div>
    </div>
  );
}
