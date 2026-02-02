"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrainingPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      const { data } = await (await import("@/lib/supabaseClient")).supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) router.replace("/admin/training");
      else router.replace("/login");
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="text-sm text-[var(--mp-muted)]">Redirecting...</div>
    </div>
  );
}
