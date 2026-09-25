import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import seedData from "@/data/stock-demo.json";

interface SeedVariant {
  size: string;
  dims: { w: number; d: number | null; h: number | null } | null;
  price: number | null;
  note: string;
  label?: string;
  round?: boolean;
  flag?: string;
  key?: string;
  code?: string;
  fromStock?: boolean;
}
interface SeedProduct {
  no: number;
  code: string;
  category: string;
  image?: string;
  fromStock?: boolean;
  variants: SeedVariant[];
}

// One-time import of the cleaned price list + original stock sheet. Refuses to
// run when the table already has rows so it can never overwrite real data.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const { count, error: countErr } = await db.from("stock_products").select("id", { count: "exact", head: true });
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 400 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Stock tables already contain data" }, { status: 409 });
  }

  const products = seedData.products as unknown as SeedProduct[];
  const stockSeed = (seedData as unknown as { stockSeed?: Record<string, { available: number; reserved: number; note: string }> })
    .stockSeed ?? {};

  const { data: inserted, error } = await db
    .from("stock_products")
    .insert(
      products.map((p) => ({
        code: p.code,
        category: p.category,
        image_url: p.image ?? null,
        from_stock: !!p.fromStock,
        source_no: p.no,
      }))
    )
    .select("id, source_no");
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
  }
  const idByNo = new Map(inserted.map((r) => [r.source_no as number, r.id as number]));

  const variantRows = products.flatMap((p) =>
    p.variants.map((v, i) => {
      const s = v.key ? stockSeed[v.key] : undefined;
      return {
        product_id: idByNo.get(p.no),
        code: v.code ?? p.code,
        label: v.label ?? "",
        size_text: v.size ?? "",
        width_mm: v.dims?.w ?? null,
        depth_mm: v.dims?.d ?? null,
        height_mm: v.dims?.h ?? null,
        is_round: !!v.round,
        price: v.price,
        note: v.note ?? "",
        flag: v.flag ?? null,
        from_stock: !!v.fromStock,
        sort_order: i,
        available: s?.available ?? 0,
        reserved: s?.reserved ?? 0,
        stock_note: s?.note ?? "",
        tracked: !!s,
      };
    })
  );

  const { error: vErr } = await db.from("stock_variants").insert(variantRows);
  if (vErr) {
    // roll back so a retry starts clean
    await db.from("stock_products").delete().in("id", inserted.map((r) => r.id));
    return NextResponse.json({ error: vErr.message }, { status: 400 });
  }

  return NextResponse.json({ products: inserted.length, variants: variantRows.length });
}
