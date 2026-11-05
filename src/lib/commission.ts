// Commission tier math — shared by the eligible-orders preview and the
// batch-save route, so both always agree on what a given base amount earns.
export type CommissionMode = "per_order" | "cumulative";
export type CommissionBase = "ex_vat" | "inc_vat";

export interface CommissionTier {
  min: number;
  rate: number;
}

// Default rate table. ">= 300,000" first so the lookup below (first tier
// whose min the amount clears) finds the highest-matching tier.
export const DEFAULT_TIERS: CommissionTier[] = [
  { min: 300_000, rate: 0.01 },
  { min: 100_000, rate: 0.008 },
  { min: 0, rate: 0.005 },
];

export function rateOf(amount: number, tiers: CommissionTier[] = DEFAULT_TIERS): number {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  const hit = sorted.find((t) => amount >= t.min);
  return hit ? hit.rate : 0;
}

// The tier just above the one `amount` is currently in, or null when
// already at the top tier — lets the UI show "another ฿5,000 to reach 0.8%".
export function nextTier(amount: number, tiers: CommissionTier[] = DEFAULT_TIERS): CommissionTier | null {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  return sorted.find((t) => t.min > amount) ?? null;
}

export interface CommissionOrderInput {
  id: number;
  amount: number;
}

export interface CommissionOrderResult extends CommissionOrderInput {
  rate: number;
  commission: number;
}

export function calcCommission(
  orders: CommissionOrderInput[],
  mode: CommissionMode,
  tiers: CommissionTier[] = DEFAULT_TIERS
): CommissionOrderResult[] {
  if (mode === "cumulative") {
    const total = orders.reduce((s, o) => s + o.amount, 0);
    const r = rateOf(total, tiers);
    return orders.map((o) => ({ ...o, rate: r, commission: round2(o.amount * r) }));
  }
  return orders.map((o) => {
    const r = rateOf(o.amount, tiers);
    return { ...o, rate: r, commission: round2(o.amount * r) };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
