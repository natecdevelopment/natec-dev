/** "৳ 12,50,000" — Bangladeshi lakh/crore grouping. */
export function taka(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  const neg = v < 0;
  const s = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Math.abs(v));
  return `${neg ? "−" : ""}৳ ${s}`;
}

export type PlanInput = {
  total: number; booking: number; down: number; count: number;
  frequency: "monthly" | "quarterly" | "custom"; firstDue: string; bookingDate?: string;
};
export type ScheduleRow = { due_date: string; amount: number; label: string };

function addMonths(iso: string, m: number) {
  const [y, mo, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, mo - 1 + m, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, last));
  return dt.toISOString().slice(0, 10);
}

/** Booking money + down payment + N equal instalments; the last instalment absorbs rounding so the plan adds up to the total. */
export function generateSchedule(p: PlanInput): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const start = p.bookingDate || p.firstDue;
  if (p.booking > 0) rows.push({ due_date: start, amount: p.booking, label: "Booking money" });
  if (p.down > 0) rows.push({ due_date: start, amount: p.down, label: "Down payment" });
  const rest = Math.max(0, p.total - p.booking - p.down);
  const n = Math.max(0, Math.floor(p.count));
  if (n > 0 && rest > 0) {
    const each = Math.floor(rest / n);
    const step = p.frequency === "quarterly" ? 3 : 1;
    for (let i = 0; i < n; i++) {
      rows.push({ due_date: addMonths(p.firstDue, i * step), amount: i === n - 1 ? rest - each * (n - 1) : each, label: `Instalment ${i + 1} of ${n}` });
    }
  }
  return rows;
}

export type OpenInstalment = { id: string; due_date: string; amount: number; paid_amount: number };
/** Spreads a payment over the oldest unpaid instalments first. */
export function allocatePayment(instalments: OpenInstalment[], amount: number) {
  let left = amount;
  const out: { id: string; apply: number }[] = [];
  for (const i of [...instalments].sort((a, b) => a.due_date.localeCompare(b.due_date))) {
    const open = Math.max(0, Number(i.amount) - Number(i.paid_amount));
    if (open <= 0 || left <= 0) continue;
    const apply = Math.min(open, left);
    out.push({ id: i.id, apply });
    left -= apply;
  }
  return { allocations: out, unapplied: left };
}

/** 0–4 password strength score. */
export function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}
