import { describe, expect, it } from "vitest";
import { flatSizeOf, projectFacts, storeysOf, type ProjectWithMedia } from "./projects-data";

const base = { name: "Shobuj Digonto", total_flats: 26, total_floors: null, building_type: "B+G+6 (7-storey)", flat_sizes: "", units: [] } as unknown as ProjectWithMedia;

describe("project facts", () => {
  it("reads storeys from the building type", () => {
    expect(storeysOf(base)).toBe(7);
    expect(storeysOf({ ...base, building_type: "G+7 (8-storey)" })).toBe(8);
    expect(storeysOf({ ...base, total_floors: 9 })).toBe(9);
    expect(storeysOf({ ...base, building_type: "" })).toBeNull();
  });
  it("builds a size range from unit types", () => {
    const units = [1352.77, 1335.95, 1275.78, 1347.23].map((size_sqft) => ({ size_sqft }));
    expect(flatSizeOf({ ...base, units } as never)).toBe("1,276–1,353 sft");
    expect(flatSizeOf({ ...base, flat_sizes: "1,250–1,450 sft" })).toBe("1,250–1,450 sft");
    expect(flatSizeOf(base)).toBeNull();
  });
  it("lists units, storeys and size", () => {
    expect(projectFacts({ ...base, flat_sizes: "1,276–1,353 sft" })).toEqual([
      { label: "Units", value: "26" },
      { label: "Storeys", value: "7" },
      { label: "Flat size", value: "1,276–1,353 sft" },
    ]);
  });
});
