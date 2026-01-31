"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getOrCreateAppConfig } from "@/lib/appConfig";
import { supabase } from "@/lib/supabaseClient";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";
import MarketingLogo from "@/components/MarketingLogo";

export default function LoginPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = (params.get("mode") ?? "").toLowerCase();
      if (raw === "signup") setMode("signup");
      if (raw === "signin") setMode("signin");
    } catch {
      // ignore
    }
  }, []);

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

        const { data: sess } = await supabase.auth.getSession();
        const session = sess.session;
        const role = (session?.user.app_metadata as { role?: string } | undefined)?.role ?? null;

        if (role === "cashier") {
          router.push("/pos");
          router.refresh();
          return;
        }

        const userId = session?.user.id;
        if (!userId) {
          router.push("/admin");
          router.refresh();
          return;
        }

        const cfg = await getOrCreateAppConfig(userId);
        if (cfg.error) throw cfg.error;

        router.push(cfg.data?.setup_complete ? "/admin" : "/setup");
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
    <div className="islapos-marketing min-h-screen bg-white text-zinc-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[var(--mp-primary)] text-white lg:block">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-white/20" />
            <div className="absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full bg-black/20" />
            <div className="absolute left-1/3 top-1/3 h-[420px] w-[420px] rounded-full bg-white/10" />
          </div>

          <div className="relative flex h-full flex-col justify-center px-14">
            <div className="max-w-md">
              <div className="flex items-center gap-3">
                <MarketingLogo size={40} variant="lockup" />
              </div>

              <div className="mt-10">
                <div className="text-4xl font-semibold leading-tight">Welcome</div>
                <div className="mt-3 text-sm text-white/80">
                  {t.login.adminAccess}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center bg-[var(--mp-bg)] px-6 py-12">
          <div className="w-full max-w-xl">
            <div className="mb-6 flex items-center justify-between">
              <a
                href="/"
                className="text-xs font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]"
              >
                {t.login.back}
              </a>
              <MarketingLogo size={28} variant="lockup" />
            </div>

            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-10 shadow-sm">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {mode === "signup" ? t.login.titleSignup : t.login.titleSignIn}
                </h1>
                <p className="mt-2 text-sm text-[var(--mp-muted)]">
                  {t.login.adminAccess}
                </p>
              </div>

              <div className="mt-7 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setNotice(null);
                  }}
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold border border-[var(--mp-border)] ${
                    mode === "signin"
                      ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "bg-white text-[var(--mp-fg)] hover:bg-white"
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
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold border border-[var(--mp-border)] ${
                    mode === "signup"
                      ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "bg-white text-[var(--mp-fg)] hover:bg-white"
                  }`}
                >
                  {t.login.tabCreateAccount}
                </button>
              </div>

              <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t.login.email}</span>
                  <input
                    className="h-12 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t.login.password}</span>
                  <div className="relative">
                    <input
                      className="h-12 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 pr-14 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 inline-flex h-9 -translate-y-1/2 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold text-[var(--mp-muted)] hover:text-[var(--mp-fg)]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="text-xs text-[var(--mp-muted)]">{t.login.minChars}</span>
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {notice ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {notice}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                >
                  {loading
                    ? t.login.pleaseWait
                    : mode === "signup"
                      ? t.login.submitCreate
                      : t.login.submitSignIn}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-[var(--mp-muted)]">
              {t.login.helpPrefix}{" "}
              <a className="underline hover:text-[var(--mp-fg)]" href="/onboarding">
                {t.login.training}
              </a>
              {" "}
              {t.login.or}{" "}
              <a className="underline hover:text-[var(--mp-fg)]" href="/contact">
                {t.login.contact}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
