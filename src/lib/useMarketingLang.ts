"use client";

import { useSyncExternalStore } from "react";

import {
  getMarketingLang,
  setMarketingLang,
  subscribeMarketingLang,
  type MarketingLang,
} from "@/lib/marketingLanguage";

export function useMarketingLang() {
  const lang = useSyncExternalStore<MarketingLang>(
    subscribeMarketingLang,
    getMarketingLang,
    () => "es" as MarketingLang,
  );
  return {
    lang,
    setLang: (next: MarketingLang) => setMarketingLang(next),
  };
}
