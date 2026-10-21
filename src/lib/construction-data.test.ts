import { describe, expect, it } from "vitest";
import { averagePct, isListed, statusFor } from "./construction-data";

describe("construction status rules", () => {
  it("100% is Done", () => expect(statusFor(100)).toBe("Done"));
  it("1–99% is In progress", () => { expect(statusFor(1)).toBe("In progress"); expect(statusFor(99)).toBe("In progress"); });
  it("0% is Not started", () => expect(statusFor(0)).toBe("Not started"));
  it("Not applicable is kept whatever the %", () => expect(statusFor(40, "Not applicable")).toBe("Not applicable"));
  it("category average excludes Not applicable items", () =>
    expect(averagePct([{ progress_pct: 100, status: "Done" }, { progress_pct: 50, status: "In progress" }, { progress_pct: 0, status: "Not applicable" }])).toBe(75));
  it("upcoming projects are hidden until published or above 0%", () => {
    expect(isListed({ kind: "upcoming", status_details_published: false, progress_pct: 0 })).toBe(false);
    expect(isListed({ kind: "upcoming", status_details_published: false, progress_pct: 5 })).toBe(true);
    expect(isListed({ kind: "upcoming", status_details_published: true, progress_pct: 0 })).toBe(true);
    expect(isListed({ kind: "current", status_details_published: false, progress_pct: 20 })).toBe(true);
  });
});
