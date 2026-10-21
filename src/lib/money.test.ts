import { describe, expect, it } from "vitest";
import { allocatePayment, generateSchedule, taka } from "./money";

describe("money rules", () => {
  it("formats taka with lakh grouping", () => expect(taka(1250000)).toBe("৳ 12,50,000"));
  it("formats crore", () => expect(taka(12500000)).toBe("৳ 1,25,00,000"));
  it("schedule always adds up to the total price", () => {
    const rows = generateSchedule({ total: 5000000, booking: 200000, down: 800000, count: 24, frequency: "monthly", firstDue: "2026-11-05", bookingDate: "2026-10-21" });
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(5000000);
    expect(rows).toHaveLength(26);
    expect(rows[2]!.label).toBe("Instalment 1 of 24");
    expect(rows[3]!.due_date).toBe("2026-12-05");
  });
  it("quarterly steps three months", () => {
    const rows = generateSchedule({ total: 300, booking: 0, down: 0, count: 3, frequency: "quarterly", firstDue: "2026-01-31" });
    expect(rows.map((r) => r.due_date)).toEqual(["2026-01-31", "2026-04-30", "2026-07-31"]);
  });
  it("payment is applied to the oldest unpaid instalments first", () => {
    const r = allocatePayment([
      { id: "b", due_date: "2026-02-01", amount: 100, paid_amount: 0 },
      { id: "a", due_date: "2026-01-01", amount: 100, paid_amount: 60 },
    ], 90);
    expect(r.allocations).toEqual([{ id: "a", apply: 40 }, { id: "b", apply: 50 }]);
    expect(r.unapplied).toBe(0);
  });
});
