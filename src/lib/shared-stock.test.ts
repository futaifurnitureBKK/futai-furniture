import { describe, it, expect } from "vitest";
import { setsToModules, modulesToSets, computeNewModules, computeVariantAvailable } from "./shared-stock";

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
