"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSetupContext, getLocationByRestaurant, upsertLocation } from "@/lib/setupData";

export default function SetupLocationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [name, setName] = useState("Main Location");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("PR");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");
  const [timezone, setTimezone] = useState("America/Puerto_Rico");

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

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      const existing = await getLocationByRestaurant(rid);
      if (cancelled) return;
      if (existing.error) {
        setError(existing.error.message);
        setLoading(false);
        return;
      }

      if (existing.data) {
        setLocationId(existing.data.id);
        setName(existing.data.name ?? "Main Location");
        setAddress1(existing.data.address1 ?? "");
        setAddress2(existing.data.address2 ?? "");
        setCity(existing.data.city ?? "");
        setState(existing.data.state ?? "PR");
        setPostalCode(existing.data.postal_code ?? "");
        setCountry(existing.data.country ?? "US");
        setTimezone(existing.data.timezone ?? "America/Puerto_Rico");
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

    if (!restaurantId) {
      router.replace("/setup/restaurant");
      return;
    }

    const res = await upsertLocation({
      id: locationId ?? undefined,
      restaurant_id: restaurantId,
      name: name.trim(),
      address1: address1.trim(),
      address2,
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
      country: country.trim(),
      timezone: timezone.trim(),
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    router.push("/setup/taxes");
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
            <h1 className="text-2xl font-semibold tracking-tight">Setup: Location</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Address, timezone, and business details.</p>
          </div>
          <button
            onClick={() => router.push("/setup")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null} */}

        <form
          onSubmit={onSave}
          className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Location name</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Address line 1</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Address line 2 (optional)</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">City</span>
                <input
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">State</span>
                <input
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Postal code</span>
                <input
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Country</span>
                <input
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Timezone</span>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                Example: America/Puerto_Rico
              </span>
            </label>

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!name.trim() || !address1.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim() || !timezone.trim()}
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
