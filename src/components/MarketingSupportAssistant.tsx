"use client";

import { useEffect, useMemo, useState } from "react";

import { useMarketingLang } from "@/lib/useMarketingLang";

type KBEntry = {
  id: string;
  keywords: string[];
  title: { en: string; es: string };
  answer: { en: string; es: string };
};

type KBResponse = {
  entries?: KBEntry[];
};

type ChatMsg = { role: "user" | "assistant"; text: string };

export default function MarketingSupportAssistant() {
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    title: isEs ? "Asistente de Ventas y Producto" : "Sales & Product Assistant",
    subtitle: isEs ? "Preguntas sobre el app, precios o ventas." : "Questions about the app, pricing, or sales.",
    placeholder: isEs ? "Escribe tu pregunta..." : "Type your question...",
    send: isEs ? "Enviar" : "Send",
    noAnswer: isEs
      ? "No encontré una respuesta exacta. Puedes escribirnos en Contacto."
      : "I couldn’t find an exact answer. You can reach us on the Contact page.",
    contact: isEs ? "Abrir Contacto" : "Open Contact",
    you: isEs ? "Tú" : "You",
    assistant: isEs ? "Asistente" : "Assistant",
  };

  const [kb, setKb] = useState<KBEntry[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadKb() {
      try {
        const res = await fetch("/marketing-kb.json");
        const json = (await res.json().catch(() => null)) as KBResponse | null;
        if (cancelled) return;
        setKb(Array.isArray(json?.entries) ? json?.entries ?? [] : []);
      } catch {
        if (!cancelled) setKb([]);
      }
    }
    void loadKb();
    return () => {
      cancelled = true;
    };
  }, []);

  const bestMatch = (question: string) => {
    const text = question.toLowerCase();
    let best: { score: number; entry: KBEntry | null } = { score: 0, entry: null };
    for (const entry of kb) {
      const score = entry.keywords.reduce((acc, k) => (text.includes(k.toLowerCase()) ? acc + 1 : acc), 0);
      if (score > best.score) best = { score, entry };
    }
    return best.entry && best.score > 0 ? best.entry : null;
  };

  function onSend() {
    const q = input.trim();
    if (!q) return;
    const match = bestMatch(q);
    const answer = match ? `${isEs ? match.title.es : match.title.en}\n${isEs ? match.answer.es : match.answer.en}` : t.noAnswer;
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: answer }]);
    setInput("");
  }

  const hasChat = useMemo(() => messages.length > 0, [messages.length]);

  return (
    <div className="mt-8 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
      <div className="text-sm font-semibold">{t.title}</div>
      <div className="mt-1 text-xs text-[var(--mp-muted)]">{t.subtitle}</div>

      <div className="mt-4 rounded-xl border border-[var(--mp-border)] bg-white p-4 text-sm">
        {hasChat ? (
          messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className="mb-3">
              <div className="text-xs font-semibold text-[var(--mp-muted)]">
                {m.role === "user" ? t.you : t.assistant}
              </div>
              <div className="whitespace-pre-line">{m.text}</div>
            </div>
          ))
        ) : (
          <div className="text-[var(--mp-muted)]">{t.noAnswer}</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="h-11 rounded-lg border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
        />
        <button
          type="button"
          onClick={onSend}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
        >
          {t.send}
        </button>
      </div>

      <div className="mt-4">
        <a className="text-sm font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/contact">
          {t.contact}
        </a>
      </div>
    </div>
  );
}
