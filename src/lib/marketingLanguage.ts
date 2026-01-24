export type MarketingLang = "es" | "en";

const STORAGE_KEY = "islapos_lang";
const DEFAULT_LANG: MarketingLang = "es";

function isLang(value: unknown): value is MarketingLang {
  return value === "es" || value === "en";
}

export function getMarketingLang(): MarketingLang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_LANG;
}

export function setMarketingLang(lang: MarketingLang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("islapos:lang"));
}

export function subscribeMarketingLang(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("islapos:lang", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("islapos:lang", handler);
  };
}
