"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getSetupContext, getRestaurant, upsertRestaurant } from "@/lib/setupData";

function slugifySubdomain(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function uploadRestaurantLogo(params: {
  restaurantId: string;
  file: File;
}): Promise<{ path: string } | { error: Error }> {
  const safe = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${params.restaurantId}/branding/${Date.now()}-${safe}`;
  const res = await supabase.storage
    .from("menu")
    .upload(path, params.file, { upsert: true, contentType: params.file.type || undefined });
  if (res.error) return { error: new Error(res.error.message) };
  return { path };
}

export default function SetupRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setNotice(null);
      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
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
          setSubdomain(res.data.subdomain ?? "");
          setExistingLogoPath(res.data.logo_path ?? null);
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
    setNotice(null);
    setSaving(true);

    try {
      const ctx = await getSetupContext();
      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      // Ensure we have a restaurant row so we can upload logo into a stable restaurantId folder.
      const pre = await upsertRestaurant({
        id: restaurantId ?? undefined,
        owner_user_id: ctx.session.user.id,
        name: name.trim(),
        phone,
        email,
        subdomain: slugifySubdomain(subdomain),
      });

      if (pre.error) {
        setError(pre.error.message);
        return;
      }

      const rid = pre.data?.id ?? restaurantId;
      if (!rid) {
        setError("Failed to determine restaurant id");
        return;
      }

      setRestaurantId(rid);

      let logo_path: string | undefined;
      if (logoFile) {
        const uploaded = await uploadRestaurantLogo({ restaurantId: rid, file: logoFile });
        if ("error" in uploaded) {
          setError(uploaded.error.message);
          return;
        }
        logo_path = uploaded.path;
      }

      const res = await upsertRestaurant({
        id: rid,
        owner_user_id: ctx.session.user.id,
        name: name.trim(),
        phone,
        email,
        subdomain: slugifySubdomain(subdomain),
        logo_path: logo_path ?? (existingLogoPath ?? undefined),
      });

      if (res.error) {
        setError(res.error.message);
        return;
      }

      if (logo_path && res.data?.logo_path !== logo_path) {
        setNotice(
          "Logo was uploaded but could not be saved to the database. Add restaurants.logo_path (text) column in Supabase to persist it.",
        );
      }
      if (subdomain.trim() && res.data?.subdomain !== slugifySubdomain(subdomain)) {
        setNotice(
          "Subdomain could not be saved to the database. Add restaurants.subdomain (text) column in Supabase to persist it.",
        );
      }

      router.push("/setup/location");
    } finally {
      setSaving(false);
    }
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

        {notice ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {notice}
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

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Subdomain (optional)</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="e.g. my-restaurant"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Only letters, numbers, and hyphens. We’ll auto-format it.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Logo (optional)</span>
              <input
                className="text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
              {existingLogoPath ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Existing logo: {existingLogoPath}</span>
              ) : null}
            </label>

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!name.trim() || saving}
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
