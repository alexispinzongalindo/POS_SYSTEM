import { supabase } from "@/lib/supabaseClient";

export type KDSToken = {
  id: string;
  restaurant_id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export async function listKDSTokens(restaurantId: string) {
  return supabase
    .from("kds_tokens")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .returns<KDSToken[]>();
}

export async function createKDSToken(restaurantId: string, name: string) {
  const token = generateToken();
  return supabase
    .from("kds_tokens")
    .insert({
      restaurant_id: restaurantId,
      token,
      name: name.trim() || "Kitchen Display",
      is_active: true,
    })
    .select("*")
    .maybeSingle<KDSToken>();
}

export async function toggleKDSToken(tokenId: string, isActive: boolean) {
  return supabase
    .from("kds_tokens")
    .update({ is_active: isActive })
    .eq("id", tokenId)
    .select("*")
    .maybeSingle<KDSToken>();
}

export async function deleteKDSToken(tokenId: string) {
  return supabase.from("kds_tokens").delete().eq("id", tokenId);
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
