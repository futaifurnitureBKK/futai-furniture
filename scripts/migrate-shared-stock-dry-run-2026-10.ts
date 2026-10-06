// Dry run only — for YN-01-4, QC-A2401, and YN-05, shows what each would
// become after turning on shared stock: the unit_factor this script would
// assign to each existing size (from the width in size_text: 1200=1,
// 2400=2, 3600=3 modules) and the resulting shared module pool
// (sum of available/reserved/defective × factor across all that model's
// sizes). Nothing is written. Compare the "AFTER" totals against the
// reference the request gave: YN-01-4 = 6 sets (1 reserved),
// QC-A2401 = 8.5 sets (4 reserved), YN-05 = 4.5 sets.
// Run with: npx tsx scripts/migrate-shared-stock-dry-run-2026-10.ts
export {}; // forces module scope so this file's top-level names never clash with sibling scripts

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_CODES = ["YN-01-4", "QC-A2401", "YN-05"];

// 1200mm -> 1 module, 2400mm -> 2 modules, 3600mm -> 3 modules (a module is
// one 2-seat unit; a "set" referenced elsewhere is 2 modules / 4 seats).
function unitFactorFor(sizeText: string): number | null {
  const widths = [...sizeText.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!widths.length) return null;
  const width = widths[0];
  if (Math.abs(width - 1200) < 50) return 1;
  if (Math.abs(width - 2400) < 50) return 2;
  if (Math.abs(width - 3600) < 50) return 3;
  return null;
}

async function fetchAll<T>(path: string): Promise<T[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

interface VariantRow {
  id: number;
  product_id: number;
  size_text: string;
  available: number;
  reserved: number;
  defective: number;
  archived: boolean;
}
interface ProductRow {
  id: number;
  code: string;
}

async function main() {
  const products = await fetchAll<ProductRow>(
    `stock_products?select=id,code&code=in.(${TARGET_CODES.map((c) => encodeURIComponent(c)).join(",")})`
  );
  if (!products.length) {
    console.log("No matching products found for:", TARGET_CODES.join(", "));
    return;
  }

  for (const product of products) {
    const variants = await fetchAll<VariantRow>(
      `stock_variants?select=id,product_id,size_text,available,reserved,defective,archived&product_id=eq.${product.id}`
    );

    console.log(`\n=== ${product.code} (product_id=${product.id}) ===`);
    console.log("BEFORE (per size):");
    let availModules = 0;
    let reservedModules = 0;
    let defectiveModules = 0;
    let unmapped = 0;
    for (const v of variants) {
      const factor = unitFactorFor(v.size_text);
      const factorLabel = factor == null ? "?? UNRECOGNIZED SIZE" : `factor=${factor}`;
      console.log(
        `  size="${v.size_text}" available=${v.available} reserved=${v.reserved} defective=${v.defective} archived=${v.archived} — ${factorLabel}`
      );
      if (factor == null) {
        unmapped++;
        continue;
      }
      availModules += v.available * factor;
      reservedModules += v.reserved * factor;
      defectiveModules += v.defective * factor;
    }

    console.log("AFTER (shared pool, if migrated):");
    console.log(`  shared_available_modules = ${availModules}  (${availModules / 2} sets)`);
    console.log(`  shared_reserved_modules  = ${reservedModules}  (${reservedModules / 2} sets)`);
    console.log(`  shared_defective_modules = ${defectiveModules}  (${defectiveModules / 2} sets)`);
    if (unmapped) {
      console.log(`  ⚠ ${unmapped} size(s) didn't match 1200/2400/3600mm — review before migrating`);
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
