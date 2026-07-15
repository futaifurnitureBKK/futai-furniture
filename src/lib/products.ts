import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Category, Product } from "@/types";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseServer
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const { data, error } = await supabaseServer.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from("products")
    .select("*")
    .eq("category_slug", slug)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

// Unfiltered by is_active — used by both the admin edit page (must find
// hidden products) and the storefront (which checks is_active itself).
export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const { data, error } = await supabaseServer.from("products").select("*").eq("sku", sku).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from("products")
    .select("*")
    .eq("is_featured", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Product[];
}
