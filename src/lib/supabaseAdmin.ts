import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return _supabaseAdmin;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as unknown as Record<string, unknown>)[prop as string];
  },
});
