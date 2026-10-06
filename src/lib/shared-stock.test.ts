import { describe, it, expect } from "vitest";
import { setsToModules, modulesToSets, computeNewModules, computeVariantAvailable, getAvailable } from "./shared-stock";

describe("setsToModules / modulesToSets", () => {
  it("converts whole and half sets to modules", () => {
    expect(setsToModules(8.5)).toBe(17);
    expect(setsToModules(1)).toBe(2);
    expect(setsToModules(0.5)).toBe(1);
    expect(setsToModules(0)).toBe(0);
  });

  it("round-trips modules back to sets", () => {
    expect(modulesToSets(17)).toBe(8.5);
    expect(modulesToSets(16)).toBe(8);
  });

  it("rejects anything that isn't a whole number of modules", () => {
    expect(setsToModules(0.3)).toBeNull();
  });
});

describe("computeVariantAvailable", () => {
  it("floors pieces per size from the shared module pool", () => {
    // 1200mm = factor 1, 2400mm = factor 2, 3600mm = factor 3
    expect(computeVariantAvailable(17, 1)).toBe(17); // 1200
    expect(computeVariantAvailable(17, 2)).toBe(8); // 2400
    expect(computeVariantAvailable(17, 3)).toBe(5); // 3600
  });
});

describe("shared stock scenarios (QC-A2401 starting at 8.5 sets = 17 modules)", () => {
  const START_MODULES = 17; // 8.5 sets

  it("selling 1200mm x1 (factor 1) leaves 8 sets", () => {
    const result = computeNewModules(START_MODULES, -1);
    expect(result.ok).toBe(true);
    expect(modulesToSets(result.newModules)).toBe(8);
  });

  it("selling 3600mm x1 (factor 3) leaves 7 sets", () => {
    const result = computeNewModules(START_MODULES, -3);
    expect(result.ok).toBe(true);
    expect(modulesToSets(result.newModules)).toBe(7);
  });

  it("deleting a row restores the pool exactly (deduct then restore the same delta)", () => {
    const afterSale = computeNewModules(START_MODULES, -3); // sold 3600mm x1
    expect(afterSale.ok).toBe(true);
    const afterDelete = computeNewModules(afterSale.newModules, 3); // row deleted, restore it
    expect(afterDelete.newModules).toBe(START_MODULES);
  });

  it("selling more modules than are in the pool is rejected", () => {
    // 3600mm x6 needs 18 modules — only 17 are available
    const result = computeNewModules(START_MODULES, -18);
    expect(result.ok).toBe(false);
    expect(result.newModules).toBe(START_MODULES); // pool unchanged on rejection
  });
});

describe("getAvailable (draft rows already in the table reduce every sibling size)", () => {
  const PRODUCT_ID = 1;
  const base = { sharedStock: true, rawAvailable: 0, productId: PRODUCT_ID, sharedAvailableModules: 17 };
  const sizes = { f1: { ...base, unitFactor: 1 }, f2: { ...base, unitFactor: 2 }, f3: { ...base, unitFactor: 3 } };

  it("17 modules + a 1200mm x3 draft row -> 14/7/4", () => {
    const draft = [{ productId: PRODUCT_ID, unitFactor: 1, qty: 3 }];
    expect(getAvailable(sizes.f1, draft)).toBe(14);
    expect(getAvailable(sizes.f2, draft)).toBe(7);
    expect(getAvailable(sizes.f3, draft)).toBe(4);
  });

  it("adding a 2400mm x1 draft row on top -> 12/6/4", () => {
    const draft = [
      { productId: PRODUCT_ID, unitFactor: 1, qty: 3 },
      { productId: PRODUCT_ID, unitFactor: 2, qty: 1 },
    ];
    expect(getAvailable(sizes.f1, draft)).toBe(12);
    expect(getAvailable(sizes.f2, draft)).toBe(6);
    expect(getAvailable(sizes.f3, draft)).toBe(4);
  });

  it("removing the 1200mm row -> 15/7/5", () => {
    const draft = [{ productId: PRODUCT_ID, unitFactor: 2, qty: 1 }];
    expect(getAvailable(sizes.f1, draft)).toBe(15);
    expect(getAvailable(sizes.f2, draft)).toBe(7);
    expect(getAvailable(sizes.f3, draft)).toBe(5);
  });

  it("a draft row of a different product never affects this one", () => {
    const draft = [{ productId: 999, unitFactor: 1, qty: 100 }];
    expect(getAvailable(sizes.f1, draft)).toBe(17);
  });

  it("non-shared-stock variants ignore draft rows entirely", () => {
    const normal = { sharedStock: false, rawAvailable: 42, productId: PRODUCT_ID, sharedAvailableModules: 0, unitFactor: 1 };
    const draft = [{ productId: PRODUCT_ID, unitFactor: 1, qty: 3 }];
    expect(getAvailable(normal, draft)).toBe(42);
  });

  it("excludeIndex adds that row's own consumption back (for computing its own max)", () => {
    const draft = [
      { productId: PRODUCT_ID, unitFactor: 1, qty: 3 }, // index 0 — this row itself
      { productId: PRODUCT_ID, unitFactor: 2, qty: 1 }, // index 1
    ];
    // Editing row 0 (the 1200mm x3 row): its own max should ignore its own
    // qty, so only the 2400mm x1 row's 2 modules are subtracted from 17.
    expect(getAvailable(sizes.f1, draft, 0)).toBe(15);
  });
});
