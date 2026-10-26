import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { Category, Product } from "@/types";

// These listing queries back the homepage and category pages, which are hit
// on nearly every visit — without caching, each visit (even several in the
// same second) re-ran the full query against Supabase from scratch. Caching
// them for 60s cuts that down to roughly one query per minute per key, with
// visitors in between served from the Next.js data cache. Product detail
// lookups (getProductBySku) stay uncached on purpose, so a product an admin
// just flipped live shows up immediately rather than after up to 60s.

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await supabaseServer
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as Category[];
  },
  ["categories-all"],
  { revalidate: 60, tags: ["categories"] }
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | undefined> => {
    const { data, error } = await supabaseServer.from("categories").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data ?? undefined;
  },
  ["category-by-slug"],
  { revalidate: 60, tags: ["categories"] }
);

export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const { data, error } = await supabaseServer
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Product[];
  },
  ["products-active-all"],
  { revalidate: 60, tags: ["products"] }
);

export const getProductsByCategory = unstable_cache(
  async (slug: string): Promise<Product[]> => {
    const { data, error } = await supabaseServer
      .from("products")
      .select("*")
      .eq("category_slug", slug)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Product[];
  },
  ["products-by-category"],
  { revalidate: 60, tags: ["products"] }
);

// Unfiltered by is_active — used by both the admin edit page (must find
// hidden products) and the storefront (which checks is_active itself).
// Left uncached so a product's own page reflects edits immediately.
export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const { data, error } = await supabaseServer.from("products").select("*").eq("sku", sku).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const { data, error } = await supabaseServer
      .from("products")
      .select("*")
      .eq("is_featured", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as Product[];
  },
  ["products-featured"],
  { revalidate: 60, tags: ["products"] }
);
