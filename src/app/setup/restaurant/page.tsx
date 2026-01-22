"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSetupContext, getRestaurant, upsertRestaurant } from "@/lib/setupData";

export default function SetupRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const existingRestaurantId = (ctx.config?.restaurant_id as string | null) ?? null;
      setRestaurantId(existingRestaurantId);

      if (existingRestaurantId) {
        const res = await getRestaurant(existingRestaurantId);
        if (cancelled) return;
        if (res.error) {
          setError(res.error.message);
          setLoading(false);
          return;
        }
        if (res.data) {
          setName(res.data.name ?? "");
          setPhone(res.data.phone ?? "");
          setEmail(res.data.email ?? "");
        }
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ctx = await getSetupContext();
    if (ctx.error || !ctx.session) {
      router.replace("/login");
      return;
    }

    const res = await upsertRestaurant({
      id: restaurantId ?? undefined,
      owner_user_id: ctx.session.user.id,
      name: name.trim(),
      phone,
      email,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    router.push("/setup/location");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Setup: Business</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Basic business info.</p>
          </div>
          <button
            onClick={() => router.push("/setup")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={onSave}
          className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Business name</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Phone (optional)</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Email (optional)</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!name.trim()}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
