import { describe, expect, it } from "vitest";
import { buildClientPlan, cleanPhone, parseNatecWorkbook, toIsoDate } from "./sheet-import";
import type { Cell, Workbook } from "./xlsx-lite";

// Synthetic workbook in the same layout as the Natec client payment sheet (no real client data).
const priceSheet: Cell[][] = [
  [null, "PROJECT NAME : TEST TOWER"],
  [null, "BOOKING MONEY : BDT 100,000.0"],
  [null, "Floor Name", null, "A", "B"],
  [null, null, "Flat Area", 1300.5, 1250.25],
  [null, "2nd", "Per SFT", 3000, "Booked"],
  [null, null, "Total Flat Price", 3901500, null],
];
const clientSheet: Cell[][] = [
  [null, "CLINT ID", "NAME", "PHONE", "ADDRESS", "TOTAL PRICE", "BOOKING MONEY", "DOWN PAYMENT", "REMAINING AMOUNT"],
  [null, "2A", "Test Client", 1711000000, "Somewhere", 3901500, 100000, 801500, 3000000],
  [null, "2B", null, null, null, 3800000, 0, 0, 3800000],
];
const instSheet: Cell[][] = [
  [null, "CLINT ID", "INSTALLMENT NO", null, "INSTALLMENT AMOUNT", "PAID AMOUNT", "DUE AMOUNT"],
  [null, null, "1ST", "2ND"],
  [null, "2A", 250000, 100000, 3000000, 350000, 2650000],
  [null, "INSTALL MENT NO", "INSTALLMENT AMOUNT", "DUE DATE", "penalty"],
  [null, "1ST", 1000000, "25/1/2026", 0.006],
  [null, "2ND", 2000000, "25/1/2028", 0.006],
];
const wb: Workbook = { sheetNames: ["Sheet1", "CLINT D", "INSTALLMENT"], sheets: { Sheet1: priceSheet, "CLINT D": clientSheet, INSTALLMENT: instSheet } };

describe("sheet import", () => {
  it("parses dates and phones", () => {
    expect(toIsoDate("25/1/2026")).toBe("2026-01-25");
    expect(toIsoDate(46047)).toBe("2026-01-25");
    expect(cleanPhone(1712345678)).toBe("01712345678");
    expect(cleanPhone("+8801712345678")).toBe("01712345678");
    expect(cleanPhone(null)).toBe("");
  });
  it("reads project, units, schedule and clients", () => {
    const p = parseNatecWorkbook(wb);
    expect(p.projectName).toBe("TEST TOWER");
    expect(p.bookingMoney).toBe(100000);
    expect(p.units).toEqual([{ letter: "A", size_sft: 1300.5 }, { letter: "B", size_sft: 1250.25 }]);
    expect(p.bookedNoClient).toEqual(["2B"]);
    expect(p.listedNoClient).toEqual(["2B"]);
    expect(p.schedule.map((s) => [s.no, s.amount, s.due_date])).toEqual([[1, 1000000, "2026-01-25"], [2, 2000000, "2028-01-25"]]);
    expect(p.penaltyRate).toBe(0.006);
    expect(p.warnings.some((w) => /no instalment in 2027/.test(w))).toBe(true);
    const c = p.clients[0]!;
    expect([c.flat_no, c.floor, c.phone, c.size_sft, c.remaining]).toEqual(["2A", "2nd", "01711000000", 1300.5, 3000000]);
    expect(c.paid_by_instalment).toEqual([250000, 100000]);
  });
  it("builds a plan that adds up to the total price", () => {
    const p = parseNatecWorkbook(wb);
    const { rows, pays } = buildClientPlan(p.clients[0]!, p.schedule, "2026-10-21", "Other");
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(3901500);
    expect(pays.reduce((s, r) => s + r.amount, 0)).toBe(100000 + 801500 + 350000);
    expect(pays.every((x) => x.paid_on === "2026-10-21" && x.method === "Other")).toBe(true);
    expect(rows.find((r) => r.label.startsWith("Instalment 1"))?.paid_amount).toBe(250000);
  });
  it("adds an unscheduled balance when the remaining is bigger than the plan", () => {
    const p = parseNatecWorkbook(wb);
    const c = { ...p.clients[0]!, down: 501500, remaining: 3300000 };
    const { rows } = buildClientPlan(c, p.schedule, "2026-10-21", "Other");
    expect(rows.at(-1)?.label).toMatch(/Unscheduled balance/);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(c.total_price);
  });
});
