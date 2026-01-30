"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { getSetupContext } from "@/lib/setupData";
import {
  listKDSTokens,
  createKDSToken,
  toggleKDSToken,
  deleteKDSToken,
  type KDSToken,
} from "@/lib/kdsTokens";

export default function AdminKDSPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<KDSToken[]>([]);
  const [newName, setNewName] = useState("");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [selectedToken, setSelectedToken] = useState<KDSToken | null>(null);

  async function loadTokens(rid: string) {
    const res = await listKDSTokens(rid);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setTokens(res.data ?? []);

    // Generate QR codes for each token
    const codes: Record<string, string> = {};
    for (const t of res.data ?? []) {
      const url = `${window.location.origin}/kds/${t.token}`;
      codes[t.id] = await QRCode.toDataURL(url, { width: 256, margin: 2 });
    }
    setQrCodes(codes);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
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

      try {
        await loadTokens(rid);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load KDS tokens");
      } finally {
        setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate() {
    if (!restaurantId) return;
    setError(null);

    const res = await createKDSToken(restaurantId, newName);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewName("");
    await loadTokens(restaurantId);
  }

  async function handleToggle(token: KDSToken) {
    if (!restaurantId) return;
    setError(null);

    const res = await toggleKDSToken(token.id, !token.is_active);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await loadTokens(restaurantId);
  }

  async function handleDelete(tokenId: string) {
    if (!restaurantId) return;
    setError(null);

    const res = await deleteKDSToken(tokenId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setSelectedToken(null);
    await loadTokens(restaurantId);
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display (KDS)</h1>
            <p className="text-sm text-[var(--mp-muted)]">
              Generate QR codes for kitchen staff to view and manage orders on tablets/phones.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create new token */}
        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
          <h2 className="text-base font-semibold">Create KDS Link</h2>
          <p className="mt-1 text-sm text-[var(--mp-muted)]">
            Create a new QR code that kitchen staff can scan to access orders.
          </p>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Main Kitchen, Bar)"
              className="h-11 flex-1 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
            />
            <button
              onClick={handleCreate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
            >
              Create QR Code
            </button>
          </div>
        </div>

        {/* Token list */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`rounded-3xl border p-5 shadow-sm ${
                token.is_active
                  ? "border-[var(--mp-border)] bg-white/90"
                  : "border-zinc-300 bg-zinc-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{token.name}</h3>
                  <p className="mt-1 text-xs text-[var(--mp-muted)]">
                    {token.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(token)}
                    className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold ${
                      token.is_active
                        ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {token.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(token.id)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* QR Code */}
              {qrCodes[token.id] && (
                <div className="mt-4 flex flex-col items-center">
                  <button
                    onClick={() => setSelectedToken(token)}
                    className="rounded-xl border border-[var(--mp-border)] bg-white p-2 hover:shadow-md"
                  >
                    <img
                      src={qrCodes[token.id]}
                      alt={`QR Code for ${token.name}`}
                      className="h-32 w-32"
                    />
                  </button>
                  <p className="mt-2 text-xs text-[var(--mp-muted)]">Tap to enlarge</p>
                </div>
              )}

              {/* URL */}
              <div className="mt-3 rounded-lg bg-zinc-100 px-3 py-2">
                <code className="break-all text-xs text-zinc-600">
                  {typeof window !== "undefined" && `${window.location.origin}/kds/${token.token}`}
                </code>
              </div>
            </div>
          ))}

          {tokens.length === 0 && (
            <div className="col-span-2 rounded-3xl border border-dashed border-[var(--mp-border)] bg-white/50 p-10 text-center">
              <div className="text-4xl">📱</div>
              <div className="mt-3 font-semibold">No KDS links yet</div>
              <div className="mt-1 text-sm text-[var(--mp-muted)]">
                Create a QR code above for kitchen staff to scan
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-6 shadow-sm">
          <h2 className="text-base font-semibold">How to use</h2>
          <ol className="mt-3 space-y-2 text-sm text-[var(--mp-muted)]">
            <li><strong>1.</strong> Create a KDS link above (one per kitchen station if needed)</li>
            <li><strong>2.</strong> Print the QR code or display it on a screen</li>
            <li><strong>3.</strong> Kitchen staff scan the QR code with their phone/tablet camera</li>
            <li><strong>4.</strong> Orders appear automatically - tap START → READY → DONE</li>
            <li><strong>5.</strong> Display auto-refreshes every 10 seconds</li>
          </ol>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedToken && qrCodes[selectedToken.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
            <h3 className="text-lg font-semibold">{selectedToken.name}</h3>
            <p className="mt-1 text-sm text-[var(--mp-muted)]">Scan with phone/tablet camera</p>
            
            <div className="mt-4 flex justify-center">
              <img
                src={qrCodes[selectedToken.id]}
                alt={`QR Code for ${selectedToken.name}`}
                className="h-64 w-64"
              />
            </div>

            <div className="mt-4 rounded-lg bg-zinc-100 px-3 py-2">
              <code className="break-all text-xs text-zinc-600">
                {typeof window !== "undefined" && `${window.location.origin}/kds/${selectedToken.token}`}
              </code>
            </div>

            <button
              onClick={() => setSelectedToken(null)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
