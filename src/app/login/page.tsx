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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
        <div className="mb-6 flex justify-center">
          <a
            href="/"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {t.login.back}
          </a>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signup" ? t.login.titleSignup : t.login.titleSignIn}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
              className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium border dark:border-zinc-800 ${
                mode === "signin"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-black dark:text-zinc-50 dark:hover:bg-zinc-900"
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
              className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium border dark:border-zinc-800 ${
                mode === "signup"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-black dark:text-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {t.login.tabCreateAccount}
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t.login.email}</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
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
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={8}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
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
              className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              {loading ? t.login.pleaseWait : mode === "signup" ? t.login.submitCreate : t.login.submitSignIn}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          {t.login.helpPrefix}{" "}
          <a className="underline hover:text-zinc-900 dark:hover:text-zinc-50" href="/onboarding">
            {t.login.training}
          </a>
          {" "}{t.login.or}{" "}
          <a className="underline hover:text-zinc-900 dark:hover:text-zinc-50" href="/contact">
            {t.login.contact}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
