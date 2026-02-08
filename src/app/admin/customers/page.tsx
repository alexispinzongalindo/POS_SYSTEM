"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useMarketingLang } from "@/lib/useMarketingLang";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string | null;
  notes: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Clientes" : "Customers",
    subtitle: isEs ? "Guarda y administra tu base de clientes." : "Store and manage your customer database.",
    back: isEs ? "← Volver" : "Back",
    search: isEs ? "Buscar clientes" : "Search customers",
    newCustomer: isEs ? "Nuevo cliente" : "New customer",
    name: isEs ? "Nombre" : "Name",
    email: isEs ? "Email" : "Email",
    phone: isEs ? "Teléfono" : "Phone",
    birthday: isEs ? "Cumpleaños" : "Birthday",
    notes: isEs ? "Notas" : "Notes",
    address1: isEs ? "Dirección" : "Address line 1",
    address2: isEs ? "Apt / Suite" : "Address line 2",
    city: isEs ? "Ciudad" : "City",
    state: isEs ? "Estado" : "State",
    postal: isEs ? "Código postal" : "Postal code",
    create: isEs ? "Crear cliente" : "Create customer",
    update: isEs ? "Guardar cambios" : "Save changes",
    delete: isEs ? "Eliminar" : "Delete",
    select: isEs ? "Selecciona un cliente para editar." : "Select a customer to edit.",
    required: isEs ? "Nombre, email y teléfono son obligatorios." : "Name, email, and phone are required.",
    created: isEs ? "Cliente creado." : "Customer created.",
    updated: isEs ? "Actualizado." : "Updated.",
    deleted: isEs ? "Eliminado." : "Deleted.",
    failed: isEs ? "No se pudo guardar." : "Failed to save.",
  };

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    notes: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [createDraft, setCreateDraft] = useState({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    notes: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === selectedId) ?? null, [customers, selectedId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus(null);
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const token = data.session.access_token;
      if (restaurantId) {
        try {
          const cached = localStorage.getItem(`islapos_customers_cache_${restaurantId}`);
          if (cached) {
            const parsed = JSON.parse(cached) as CustomerRow[];
            if (Array.isArray(parsed)) setCustomers(parsed);
          }
        } catch {
          // ignore cache parse
        }
      }
      const res = await fetch(`/api/admin/customers?query=${encodeURIComponent(query.trim())}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as { customers?: CustomerRow[]; restaurantId?: string } | null;
      if (cancelled) return;
      const next = Array.isArray(json?.customers) ? json!.customers! : [];
      setCustomers(next);
      if (json?.restaurantId) {
        setRestaurantId(json.restaurantId);
        try {
          localStorage.setItem(`islapos_customers_cache_${json.restaurantId}`, JSON.stringify(next));
        } catch {
          // ignore cache write
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query, router, restaurantId]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setDraft({
      name: selectedCustomer.name ?? "",
      email: selectedCustomer.email ?? "",
      phone: selectedCustomer.phone ?? "",
      birthday: selectedCustomer.birthday ?? "",
      notes: selectedCustomer.notes ?? "",
      addressLine1: selectedCustomer.address_line1 ?? "",
      addressLine2: selectedCustomer.address_line2 ?? "",
      city: selectedCustomer.city ?? "",
      state: selectedCustomer.state ?? "",
      postalCode: selectedCustomer.postal_code ?? "",
    });
  }, [selectedCustomer]);

  async function createCustomer() {
    setStatus(null);
    if (!createDraft.name.trim() || !createDraft.email.trim() || !createDraft.phone.trim()) {
      setStatus(t.required);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(createDraft),
    });
    if (!res.ok) {
      setStatus(t.failed);
      return;
    }
    const createdJson = (await res.json().catch(() => null)) as { id?: string } | null;
    const createdId = createdJson?.id ?? crypto.randomUUID();
    setStatus(t.created);
    setCustomers((prev) => {
      const fresh = {
        id: createdId,
        name: createDraft.name.trim(),
        email: createDraft.email.trim(),
        phone: createDraft.phone.trim(),
        birthday: createDraft.birthday || null,
        notes: createDraft.notes || null,
        address_line1: createDraft.addressLine1 || null,
        address_line2: createDraft.addressLine2 || null,
        city: createDraft.city || null,
        state: createDraft.state || null,
        postal_code: createDraft.postalCode || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CustomerRow;
      const next = [fresh, ...prev];
      if (restaurantId) {
        try {
          localStorage.setItem(`islapos_customers_cache_${restaurantId}`, JSON.stringify(next));
        } catch {
          // ignore cache write
        }
      }
      return next;
    });
    setCreateDraft({
      name: "",
      email: "",
      phone: "",
      birthday: "",
      notes: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
    });
    setQuery("");
  }

  async function saveCustomer() {
    if (!selectedCustomer) return;
    setStatus(null);
    if (!draft.name.trim() || !draft.email.trim() || !draft.phone.trim()) {
      setStatus(t.required);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: selectedCustomer.id, ...draft }),
    });
    if (!res.ok) {
      setStatus(t.failed);
      return;
    }
    setStatus(t.updated);
    setCustomers((prev) => {
      const next = prev.map((c) =>
        c.id === selectedCustomer.id
          ? {
              ...c,
              name: draft.name.trim(),
              email: draft.email.trim(),
              phone: draft.phone.trim(),
              birthday: draft.birthday || null,
              notes: draft.notes || null,
              address_line1: draft.addressLine1 || null,
              address_line2: draft.addressLine2 || null,
              city: draft.city || null,
              state: draft.state || null,
              postal_code: draft.postalCode || null,
              updated_at: new Date().toISOString(),
            }
          : c,
      );
      if (restaurantId) {
        try {
          localStorage.setItem(`islapos_customers_cache_${restaurantId}`, JSON.stringify(next));
        } catch {
          // ignore cache write
        }
      }
      return next;
    });
  }

  async function deleteCustomer() {
    if (!selectedCustomer) return;
    if (!confirm(t.delete)) return;
    setStatus(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/customers", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: selectedCustomer.id }),
    });
    if (!res.ok) {
      setStatus(t.failed);
      return;
    }
    setStatus(t.deleted);
    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== selectedCustomer.id);
      if (restaurantId) {
        try {
          localStorage.setItem(`islapos_customers_cache_${restaurantId}`, JSON.stringify(next));
        } catch {
          // ignore cache write
        }
      }
      return next;
    });
    setSelectedId(null);
    setQuery("");
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{t.title}</h1>
            <p className="mt-1 text-sm text-[var(--mp-muted)]">{t.subtitle}</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white"
          >
            {t.back}
          </button>
        </div>

        {status ? (
          <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
            {status}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm">
            <div className="text-base font-semibold">{t.newCustomer}</div>
            <div className="mt-4 grid gap-3">
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.name} value={createDraft.name} onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))} />
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.email} value={createDraft.email} onChange={(e) => setCreateDraft((p) => ({ ...p, email: e.target.value }))} />
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.phone} value={createDraft.phone} onChange={(e) => setCreateDraft((p) => ({ ...p, phone: e.target.value }))} />
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.birthday} value={createDraft.birthday} onChange={(e) => setCreateDraft((p) => ({ ...p, birthday: e.target.value }))} />
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.address1} value={createDraft.addressLine1} onChange={(e) => setCreateDraft((p) => ({ ...p, addressLine1: e.target.value }))} />
              <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.address2} value={createDraft.addressLine2} onChange={(e) => setCreateDraft((p) => ({ ...p, addressLine2: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.city} value={createDraft.city} onChange={(e) => setCreateDraft((p) => ({ ...p, city: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.state} value={createDraft.state} onChange={(e) => setCreateDraft((p) => ({ ...p, state: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.postal} value={createDraft.postalCode} onChange={(e) => setCreateDraft((p) => ({ ...p, postalCode: e.target.value }))} />
              </div>
              <textarea className="min-h-[90px] rounded-xl border border-[var(--mp-border)] px-4 py-3 text-sm" placeholder={t.notes} value={createDraft.notes} onChange={(e) => setCreateDraft((p) => ({ ...p, notes: e.target.value }))} />
              <button className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-white" onClick={createCustomer}>
                {t.create}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">{t.title}</div>
              <input className="h-10 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-[var(--mp-border)]">
              {customers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--mp-muted)]">{t.select}</div>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full flex-col gap-1 border-b border-[var(--mp-border)] px-4 py-3 text-left text-sm hover:bg-[var(--mp-soft)] ${
                      selectedId === c.id ? "bg-[var(--mp-soft)]" : ""
                    }`}
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs text-[var(--mp-muted)]">
                      {c.email} • {c.phone}
                    </span>
                  </button>
                ))
              )}
            </div>

            {selectedCustomer ? (
              <div className="mt-5 grid gap-3">
                <div className="text-sm font-semibold">{t.update}</div>
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.name} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.email} value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.phone} value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.birthday} value={draft.birthday} onChange={(e) => setDraft((p) => ({ ...p, birthday: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.address1} value={draft.addressLine1} onChange={(e) => setDraft((p) => ({ ...p, addressLine1: e.target.value }))} />
                <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.address2} value={draft.addressLine2} onChange={(e) => setDraft((p) => ({ ...p, addressLine2: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.city} value={draft.city} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} />
                  <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.state} value={draft.state} onChange={(e) => setDraft((p) => ({ ...p, state: e.target.value }))} />
                  <input className="h-11 rounded-xl border border-[var(--mp-border)] px-4 text-sm" placeholder={t.postal} value={draft.postalCode} onChange={(e) => setDraft((p) => ({ ...p, postalCode: e.target.value }))} />
                </div>
                <textarea className="min-h-[90px] rounded-xl border border-[var(--mp-border)] px-4 py-3 text-sm" placeholder={t.notes} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
                <div className="flex gap-2">
                  <button className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-white" onClick={saveCustomer}>
                    {t.update}
                  </button>
                  <button className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700" onClick={deleteCustomer}>
                    {t.delete}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
