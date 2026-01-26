import { supabase } from "@/lib/supabaseClient";

export type FloorArea = {
  id: string;
  restaurant_id: string;
  name: string;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
};

export type FloorTableShape = "round" | "square" | "rectangle";

export type FloorTable = {
  id: string;
  restaurant_id: string;
  area_id: string;
  table_number: number;
  seats: number;
  shape: FloorTableShape;
  width: number;
  height: number;
  x: number;
  y: number;
  created_at: string;
};

export type FloorObjectKind = "door" | "bar";

export type FloorObject = {
  id: string;
  restaurant_id: string;
  area_id: string;
  kind: FloorObjectKind;
  label: string | null;
  width: number;
  height: number;
  x: number;
  y: number;
  created_at: string;
};

export async function listFloorAreas(restaurantId: string) {
  return supabase
    .from("floor_areas")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<FloorArea[]>();
}

export async function addFloorArea(input: {
  restaurant_id: string;
  name: string;
  width?: number;
  height?: number;
  sort_order?: number;
}) {
  return supabase
    .from("floor_areas")
    .insert({
      restaurant_id: input.restaurant_id,
      name: input.name,
      width: input.width ?? 1200,
      height: input.height ?? 700,
      sort_order: input.sort_order ?? 0,
    })
    .select("*")
    .maybeSingle<FloorArea>();
}

export async function updateFloorArea(input: {
  id: string;
  name?: string;
  width?: number;
  height?: number;
  sort_order?: number;
}) {
  return supabase
    .from("floor_areas")
    .update({
      name: input.name,
      width: input.width,
      height: input.height,
      sort_order: input.sort_order,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<FloorArea>();
}

export async function deleteFloorArea(areaId: string) {
  return supabase.from("floor_areas").delete().eq("id", areaId);
}

export async function listFloorTables(areaId: string) {
  return supabase
    .from("floor_tables")
    .select("*")
    .eq("area_id", areaId)
    .order("table_number", { ascending: true })
    .returns<FloorTable[]>();
}

export async function listRestaurantFloorTables(restaurantId: string) {
  return supabase
    .from("floor_tables")
    .select("id, table_number")
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true })
    .returns<Pick<FloorTable, "id" | "table_number">[]>();
}

export async function addFloorTable(input: {
  restaurant_id: string;
  area_id: string;
  table_number: number;
  seats?: number;
  shape?: FloorTableShape;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}) {
  return supabase
    .from("floor_tables")
    .insert({
      restaurant_id: input.restaurant_id,
      area_id: input.area_id,
      table_number: input.table_number,
      seats: input.seats ?? 4,
      shape: input.shape ?? "square",
      width: input.width ?? 120,
      height: input.height ?? 120,
      x: input.x ?? 50,
      y: input.y ?? 50,
    })
    .select("*")
    .maybeSingle<FloorTable>();
}

export async function updateFloorTable(input: {
  id: string;
  table_number?: number;
  seats?: number;
  shape?: FloorTableShape;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}) {
  return supabase
    .from("floor_tables")
    .update({
      table_number: input.table_number,
      seats: input.seats,
      shape: input.shape,
      width: input.width,
      height: input.height,
      x: input.x,
      y: input.y,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<FloorTable>();
}

export async function deleteFloorTable(tableId: string) {
  return supabase.from("floor_tables").delete().eq("id", tableId);
}

export async function listFloorObjects(areaId: string) {
  return supabase
    .from("floor_objects")
    .select("*")
    .eq("area_id", areaId)
    .order("created_at", { ascending: true })
    .returns<FloorObject[]>();
}

export async function addFloorObject(input: {
  restaurant_id: string;
  area_id: string;
  kind: FloorObjectKind;
  label?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}) {
  return supabase
    .from("floor_objects")
    .insert({
      restaurant_id: input.restaurant_id,
      area_id: input.area_id,
      kind: input.kind,
      label: input.label?.trim() || null,
      width: input.width ?? (input.kind === "door" ? 120 : 220),
      height: input.height ?? (input.kind === "door" ? 24 : 60),
      x: input.x ?? 50,
      y: input.y ?? 50,
    })
    .select("*")
    .maybeSingle<FloorObject>();
}

export async function updateFloorObject(input: {
  id: string;
  label?: string | null;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}) {
  return supabase
    .from("floor_objects")
    .update({
      label: input.label,
      width: input.width,
      height: input.height,
      x: input.x,
      y: input.y,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<FloorObject>();
}

export async function deleteFloorObject(objectId: string) {
  return supabase.from("floor_objects").delete().eq("id", objectId);
}
