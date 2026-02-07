"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getSetupContext,
  listDeliveryIntegrations,
  upsertDeliveryIntegration,
  type DeliveryIntegration,
  type DeliveryProvider,
} from "@/lib/setupData";

type ProviderRow = {
  provider: DeliveryProvider;
  label: string;
};

const PROVIDERS: ProviderRow[] = [
  { provider: "uber_direct", label: "Uber Direct" },
  { provider: "doordash_drive", label: "DoorDash Drive" },
  { provider: "aggregator", label: "Aggregator" },
];

export default function AdminDeliveryIntegrationsPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Integraciones de delivery" : "Delivery Integrations",
    subtitle: isEs ? "Habilita proveedores por negocio y guarda credenciales." : "Enable providers per business and store credentials.",
    back: isEs ? "← Volver" : "Back",
    enabled: isEs ? "Activo" : "Enabled",
    providerKey: isEs ? "Clave del proveedor" : "Provider key",
    credentials: isEs ? "Credenciales (JSON)" : "Credentials (JSON)",
    settings: isEs ? "Configuración (JSON)" : "Settings (JSON)",
    save: isEs ? "Guardar" : "Save",
    saved: isEs ? "Guardado." : "Saved.",
    credentialsLabel: isEs ? "Credenciales" : "Credentials",
    settingsLabel: isEs ? "Configuración" : "Settings",
    jsonObjectError: isEs ? "debe ser un objeto JSON" : "must be a JSON object",
    jsonValidError: isEs ? "debe ser JSON válido" : "must be valid JSON",
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<DeliveryProvider, DeliveryIntegration | null>>({
    uber_direct: null,
    doordash_drive: null,
    aggregator: null,
  });

  const [enabled, setEnabled] = useState<Record<DeliveryProvider, boolean>>({
    uber_direct: false,
    doordash_drive: false,
    aggregator: false,
  });

  const [credentialsText, setCredentialsText] = useState<Record<DeliveryProvider, string>>({
    uber_direct: "{}",
    doordash_drive: "{}",
    aggregator: "{}",
  });

  const [settingsText, setSettingsText] = useState<Record<DeliveryProvider, string>>({
    uber_direct: "{}",
    doordash_drive: "{}",
    aggregator: "{}",
  });

  const providerCards = useMemo(() => PROVIDERS, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      const res = await listDeliveryIntegrations(rid);
      if (cancelled) return;

      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }

      const map: Record<DeliveryProvider, DeliveryIntegration | null> = {
        uber_direct: null,
        doordash_drive: null,
        aggregator: null,
      };

      for (const r of res.data ?? []) {
        map[r.provider] = r;
      }

      setRows(map);
      setEnabled({
        uber_direct: map.uber_direct?.enabled ?? false,
        doordash_drive: map.doordash_drive?.enabled ?? false,
        aggregator: map.aggregator?.enabled ?? false,
      });

      setCredentialsText({
        uber_direct: JSON.stringify(map.uber_direct?.credentials_json ?? {}, null, 2),
        doordash_drive: JSON.stringify(map.doordash_drive?.credentials_json ?? {}, null, 2),
        aggregator: JSON.stringify(map.aggregator?.credentials_json ?? {}, null, 2),
      });

      setSettingsText({
        uber_direct: JSON.stringify(map.uber_direct?.settings_json ?? {}, null, 2),
        doordash_drive: JSON.stringify(map.doordash_drive?.settings_json ?? {}, null, 2),
        aggregator: JSON.stringify(map.aggregator?.settings_json ?? {}, null, 2),
      });

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function parseJson(label: string, value: string) {
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { data: null as Record<string, unknown> | null, error: `${label} ${t.jsonObjectError}` };
      }
      return { data: parsed as Record<string, unknown>, error: null as string | null };
    } catch {
      return { data: null as Record<string, unknown> | null, error: `${label} ${t.jsonValidError}` };
    }
  }

  async function saveProvider(provider: DeliveryProvider) {
    setError(null);
    setSuccess(null);

    if (!restaurantId) {
      router.replace("/setup/restaurant");
      return;
    }

    const creds = parseJson(t.credentialsLabel, credentialsText[provider]);
    if (creds.error) {
      setError(`${provider}: ${creds.error}`);
      return;
    }

    const settings = parseJson(t.settingsLabel, settingsText[provider]);
    if (settings.error) {
      setError(`${provider}: ${settings.error}`);
      return;
    }

    const res = await upsertDeliveryIntegration({
      id: rows[provider]?.id ?? undefined,
      restaurant_id: restaurantId,
      provider,
      enabled: enabled[provider],
      credentials_json: creds.data,
      settings_json: settings.data,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setRows((prev) => ({ ...prev, [provider]: res.data ?? null }));
    setSuccess(t.saved);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            {t.back}
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {providerCards.map((p) => (
            <div
              key={p.provider}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{p.label}</h2>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {t.providerKey}: {p.provider}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled[p.provider]}
                    onChange={(e) =>
                      setEnabled((prev) => ({
                        ...prev,
                        [p.provider]: e.target.checked,
                      }))
                    }
                  />
                  {t.enabled}
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t.credentials}</label>
                  <textarea
                    value={credentialsText[p.provider]}
                    onChange={(e) =>
                      setCredentialsText((prev) => ({
                        ...prev,
                        [p.provider]: e.target.value,
                      }))
                    }
                    rows={8}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t.settings}</label>
                  <textarea
                    value={settingsText[p.provider]}
                    onChange={(e) =>
                      setSettingsText((prev) => ({
                        ...prev,
                        [p.provider]: e.target.value,
                      }))
                    }
                    rows={8}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void saveProvider(p.provider)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                >
                  {t.save}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
