"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function LoginPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setNotice(t.login.noticeSignup);
        setMode("signin");
        setPassword("");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
        <div className="mb-6 flex justify-center">
          <a
            href="/"
            className="text-xs font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]"
          >
            {t.login.back}
          </a>
        </div>
        <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signup" ? t.login.titleSignup : t.login.titleSignIn}
            </h1>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">
              IslaPOS — {t.login.adminAccess}
            </p>
          </div>

          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium border border-[var(--mp-border)] ${
                mode === "signin"
                  ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "bg-[var(--mp-surface)] text-[var(--mp-fg)] hover:bg-white/60"
              }`}
            >
              {t.login.tabSignIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setNotice(null);
              }}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium border border-[var(--mp-border)] ${
                mode === "signup"
                  ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                  : "bg-[var(--mp-surface)] text-[var(--mp-fg)] hover:bg-white/60"
              }`}
            >
              {t.login.tabCreateAccount}
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t.login.email}</span>
              <input
                className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t.login.password}</span>
              <input
                className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={8}
              />
              <span className="text-xs text-[var(--mp-muted)]">
                {t.login.minChars}
              </span>
            </label>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
            >
              {loading ? t.login.pleaseWait : mode === "signup" ? t.login.submitCreate : t.login.submitSignIn}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--mp-muted)]">
          {t.login.helpPrefix}{" "}
          <a className="underline hover:text-[var(--mp-fg)]" href="/onboarding">
            {t.login.training}
          </a>
          {" "}{t.login.or}{" "}
          <a className="underline hover:text-[var(--mp-fg)]" href="/contact">
            {t.login.contact}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
