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
    manual: isEs ? "Manual de Usuario" : "User Manual",
    you: isEs ? "Tú" : "You",
    assistant: isEs ? "Asistente" : "Assistant",
    quick: isEs ? "Preguntas rápidas" : "Quick questions",
    q1: isEs ? "¿Cuánto cuesta IslaPOS?" : "How much does IslaPOS cost?",
    q2: isEs ? "¿Cómo empiezo la prueba gratis?" : "How do I start the free trial?",
    q3: isEs ? "¿Funciona offline?" : "Does it work offline?",
    q4: isEs ? "¿Cómo configuro el menú?" : "How do I set up the menu?",
  };

  const [kb, setKb] = useState<KBEntry[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        text: isEs
          ? "Hola. Soy el asistente de IslaPOS. ¿En qué puedo ayudarle hoy?"
          : "Hi. I’m the IslaPOS assistant. How can I help you today?",
      },
    ]);
    setInput("");
  }, [isEs]);

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
    <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{t.title}</div>
          <div className="mt-1 text-xs text-[var(--mp-muted)]">{t.subtitle}</div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-[var(--mp-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--mp-muted)] sm:flex">
          IslaPOS AI
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
        <div className="max-h-64 overflow-auto pr-2">
          {hasChat ? (
            messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "bg-[#f7f2e9] text-[var(--mp-fg)]"
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-[var(--mp-muted)]">{t.noAnswer}</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-[var(--mp-muted)]">{t.quick}:</span>
          {[t.q1, t.q2, t.q3, t.q4].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-full border border-[var(--mp-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--mp-fg)] hover:bg-black/[0.03]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="h-11 rounded-2xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
        />
        <button
          type="button"
          onClick={onSend}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
        >
          {t.send}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <a className="text-sm font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/contact">
          {t.contact}
        </a>
        <a className="text-sm font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/knowledge" target="_blank" rel="noreferrer">
          {t.manual}
        </a>
      </div>
    </div>
  );
}
