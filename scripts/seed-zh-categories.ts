import { CATEGORIES } from "../src/data/mock";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  let count = 0;
  for (const c of CATEGORIES) {
    const res = await fetch(`${url}/rest/v1/categories?slug=eq.${encodeURIComponent(c.slug)}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name_zh: c.name_zh, description_zh: c.description_zh }),
    });
    if (!res.ok) throw new Error(`update ${c.slug} failed: ${res.status} ${await res.text()}`);
    count++;
  }
  console.log(`Updated ${count} categories with zh translations`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
