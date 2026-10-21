/**
 * Reads Natec's client payment workbook (the "SD CLINT PAYMENT" format) into clean records.
 * Sheets are found by their content, not their names:
 *  - price sheet:   "PROJECT NAME : …", "BOOKING MONEY : BDT …", a "Floor Name" row with flat letters,
 *                   a "Flat Area" row with sizes, and floor rows ("2nd", "3rd" …) marking "Booked" flats.
 *  - client sheet:  header row with "CLINT ID | NAME | PHONE | ADDRESS | TOTAL PRICE | BOOKING MONEY | DOWN PAYMENT | REMAINING AMOUNT".
 *  - instalments:   per-client paid amounts by instalment (1ST … 24th), and the schedule
 *                   "INSTALLMENT NO | INSTALLMENT AMOUNT | DUE DATE | penalty".
 * Only values present in the workbook are used. Anything the workbook does not contain
 * (payment dates, booking dates) is left for the admin and flagged.
 */
import type { Cell, Workbook } from "./xlsx-lite";

export type ScheduleItem = { no: number; label: string; amount: number; due_date: string };
export type ImportClient = {
  flat_no: string; floor: string; letter: string;
  full_name: string; phone: string; address: string;
  total_price: number; booking: number; down: number; remaining: number;
  size_sft: number | null;
  paid_by_instalment: number[]; // index 0 = 1st instalment
  issues: string[];
};
export type ParsedWorkbook = {
  projectName: string;
  bookingMoney: number | null;
  units: { letter: string; size_sft: number }[];
  floors: string[];
  bookedNoClient: string[]; // flats marked "Booked" in the price sheet without client details
  listedNoClient: string[]; // rows in the client sheet with a price but no name
  schedule: ScheduleItem[];
  penaltyRate: number | null;
  clients: ImportClient[];
  warnings: string[];
};

const txt = (c: Cell) => (c == null ? "" : String(c).trim());
const num = (c: Cell): number | null => {
  if (typeof c === "number") return c;
  const s = txt(c).replace(/[,৳\s]|BDT/gi, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const money = (n: number | null) => (n == null ? 0 : Math.round(n));
const ordinalNo = (s: string) => { const m = /^(\d+)\s*(st|nd|rd|th)$/i.exec(s.replace(/\s+/g, "")); return m ? Number(m[1]) : null; };

export function toIsoDate(c: Cell): string | null {
  if (typeof c === "number" && c > 20000 && c < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(c) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(txt(c));
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

/** Bangladesh mobile → "01XXXXXXXXX", or "" if missing/invalid. Excel often drops the leading 0. */
export function cleanPhone(c: Cell): string {
  let d = txt(c).replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : "";
}

function findCell(rows: Cell[][], re: RegExp): { r: number; c: number } | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) if (re.test(txt(row[c] ?? null))) return { r, c };
  }
  return null;
}
const sheetWith = (wb: Workbook, re: RegExp) => wb.sheetNames.map((n) => wb.sheets[n] ?? []).find((rows) => findCell(rows, re));

export function parseNatecWorkbook(wb: Workbook): ParsedWorkbook {
  const warnings: string[] = [];

  /* ---- price sheet ---- */
  const price = wb.sheetNames.map((n) => wb.sheets[n] ?? []).find((rows) => findCell(rows, /flat\s*area/i) && findCell(rows, /per\s*sft/i));
  let projectName = "", bookingMoney: number | null = null;
  const units: { letter: string; size_sft: number }[] = [];
  const floors: string[] = [];
  const bookedNoClient: string[] = [];
  const letterCol = new Map<number, string>();
  if (price) {
    const pn = findCell(price, /project\s*name\s*:/i);
    if (pn) projectName = txt(price[pn.r]![pn.c]!).replace(/.*project\s*name\s*:\s*/i, "").trim();
    const bm = findCell(price, /booking\s*money\s*:/i);
    if (bm) bookingMoney = num(txt(price[bm.r]![bm.c]!).replace(/.*:\s*/, ""));
    const fn = findCell(price, /^floor\s*name$/i);
    const fa = findCell(price, /^flat\s*area$/i);
    if (fn) price[fn.r]!.forEach((v, c) => { if (/^[A-Z]$/.test(txt(v))) letterCol.set(c, txt(v)); });
    if (fa) for (const [c, letter] of letterCol) { const s = num(price[fa.r]![c] ?? null); if (s) units.push({ letter, size_sft: s }); }
    if (fn) for (let r = fn.r + 1; r < price.length; r++) {
      const label = txt(price[r]?.[fn.c] ?? null);
      if (!ordinalNo(label)) continue;
      floors.push(label);
      for (const [c, letter] of letterCol) if (/booked/i.test(txt(price[r]![c] ?? null))) bookedNoClient.push(`${ordinalNo(label)}${letter}`);
    }
  } else warnings.push("No price sheet found (flat sizes and floors were not read).");

  /* ---- client sheet ---- */
  const clientsSheet = sheetWith(wb, /^cli(e)?nt\s*id$/i) && wb.sheetNames.map((n) => wb.sheets[n] ?? []).find((rows) => findCell(rows, /^remaining\s*amount$/i));
  const clients: ImportClient[] = [];
  const listedNoClient: string[] = [];
  if (clientsSheet) {
    const h = findCell(clientsSheet, /^cli(e)?nt\s*id$/i)!;
    const head = clientsSheet[h.r]!.map((v) => txt(v).toUpperCase());
    const col = (re: RegExp) => head.findIndex((x) => re.test(x));
    const C = { id: h.c, name: col(/^NAME/), phone: col(/PHONE/), address: col(/ADDRESS/), total: col(/TOTAL\s*PRICE/), booking: col(/BOOKING/), down: col(/DOWN/), remaining: col(/REMAINING/) };
    for (let r = h.r + 1; r < clientsSheet.length; r++) {
      const row = clientsSheet[r] ?? [];
      const id = txt(row[C.id] ?? null).toUpperCase().replace(/\s+/g, "");
      if (!/^\d+[A-Z]$/.test(id)) continue;
      const name = txt(row[C.name] ?? null);
      const total = num(row[C.total] ?? null);
      if (!name) { if (total) listedNoClient.push(id); continue; }
      const letter = id.slice(-1), floorNo = Number(id.slice(0, -1));
      const floor = floors.find((f) => ordinalNo(f) === floorNo) ?? `${floorNo}${["th", "st", "nd", "rd"][floorNo % 10 > 3 || [11, 12, 13].includes(floorNo % 100) ? 0 : floorNo % 10]}`;
      const totalR = money(total), booking = money(num(row[C.booking] ?? null)), down = money(num(row[C.down] ?? null));
      const remainingSheet = num(row[C.remaining] ?? null);
      const issues: string[] = [];
      if (total != null && Math.abs(total - totalR) > 0.001) issues.push(`Total price ${total.toFixed(2)} rounded to ৳ ${totalR.toLocaleString("en-IN")}.`);
      const phone = cleanPhone(row[C.phone] ?? null);
      if (!phone) issues.push("No valid phone number in the sheet.");
      const remaining = totalR - booking - down;
      if (remainingSheet != null && Math.abs(money(remainingSheet) - remaining) > 1) issues.push(`Sheet remaining ৳ ${money(remainingSheet).toLocaleString("en-IN")} ≠ total − booking − down (৳ ${remaining.toLocaleString("en-IN")}).`);
      clients.push({
        flat_no: id, floor, letter, full_name: name, phone, address: txt(row[C.address] ?? null),
        total_price: totalR, booking, down, remaining,
        size_sft: units.find((u) => u.letter === letter)?.size_sft ?? null,
        paid_by_instalment: [], issues,
      });
    }
    const seen = new Map<string, string>();
    for (const c of clients) if (c.phone) { const other = seen.get(c.phone); if (other) { c.issues.push(`Same phone number as ${other}.`); clients.find((x) => x.flat_no === other)?.issues.push(`Same phone number as ${c.flat_no}.`); } else seen.set(c.phone, c.flat_no); }
  } else warnings.push("No client sheet found (looked for a 'CLINT ID … REMAINING AMOUNT' header).");

  /* ---- instalment sheet ---- */
  const inst = wb.sheetNames.map((n) => wb.sheets[n] ?? []).find((rows) => findCell(rows, /^install\s*ment\s*no$/i) && findCell(rows, /^due\s*date$/i));
  const schedule: ScheduleItem[] = [];
  let penaltyRate: number | null = null;
  if (inst) {
    const sh = findCell(inst, /^install\s*ment\s*no$/i)!;
    const top = findCell(inst, /^cli(e)?nt\s*id$/i);
    // schedule block (the second "INSTALLMENT NO" header, below the per-client grid)
    const sched = (() => {
      for (let r = (top?.r ?? -1) + 2; r < inst.length; r++) {
        const c = (inst[r] ?? []).findIndex((v) => /^install\s*ment\s*no$/i.test(txt(v)));
        if (c >= 0 && (inst[r] ?? []).some((v) => /^due\s*date$/i.test(txt(v)))) return { r, c };
      }
      return sh;
    })();
    const hdr = inst[sched.r]!.map((v) => txt(v).toUpperCase());
    const aCol = hdr.findIndex((x) => /INSTALL\s*MENT\s*AMOUNT|^AMOUNT/.test(x));
    const dCol = hdr.findIndex((x) => /DUE\s*DATE/.test(x));
    const pCol = hdr.findIndex((x) => /PENALTY/.test(x));
    for (let r = sched.r + 1; r < inst.length; r++) {
      const row = inst[r] ?? [];
      const no = ordinalNo(txt(row[sched.c] ?? null));
      if (!no) continue;
      const due = toIsoDate(row[dCol] ?? null);
      const amount = money(num(row[aCol] ?? null));
      if (!due || !amount) { warnings.push(`Instalment ${no}: missing amount or due date in the schedule.`); continue; }
      schedule.push({ no, label: `Instalment ${no} of `, amount, due_date: due });
      if (penaltyRate == null && pCol >= 0) penaltyRate = num(row[pCol] ?? null);
    }
    schedule.sort((a, b) => a.no - b.no).forEach((s) => (s.label = `Instalment ${s.no} of ${schedule.length}`));
    for (let i = 1; i < schedule.length; i++) if (schedule[i]!.due_date <= schedule[i - 1]!.due_date) warnings.push(`Schedule dates are not in order at instalment ${schedule[i]!.no}.`);
    // look for a gap year (e.g. 2026 → 2028)
    for (let i = 1; i < schedule.length; i++) {
      const y0 = Number(schedule[i - 1]!.due_date.slice(0, 4)), y1 = Number(schedule[i]!.due_date.slice(0, 4));
      if (y1 - y0 > 1) warnings.push(`Instalment ${schedule[i]!.no} is due ${schedule[i]!.due_date} — no instalment in ${y0 + 1}. Check the date in the sheet.`);
    }

    // per-client paid grid
    if (top) {
      const ordRow = inst[top.r + 1] ?? [];
      const ordCols: { no: number; c: number }[] = [];
      ordRow.forEach((v, c) => { const n = ordinalNo(txt(v)); if (n) ordCols.push({ no: n, c }); });
      for (let r = top.r + 2; r < sched.r; r++) {
        const row = inst[r] ?? [];
        const id = txt(row[top.c] ?? null).toUpperCase().replace(/\s+/g, "");
        const client = clients.find((c) => c.flat_no === id);
        if (!client) continue;
        client.paid_by_instalment = ordCols.sort((a, b) => a.no - b.no).map(({ c }) => money(num(row[c] ?? null)));
      }
    }
  } else warnings.push("No instalment sheet found (looked for 'INSTALLMENT NO' and 'DUE DATE').");

  const planTotal = schedule.reduce((s, x) => s + x.amount, 0);
  for (const c of clients) {
    const diff = c.remaining - planTotal;
    if (schedule.length && Math.abs(diff) > 1) c.issues.push(diff > 0
      ? `Remaining ৳ ${c.remaining.toLocaleString("en-IN")} is ৳ ${diff.toLocaleString("en-IN")} more than the instalment plan (৳ ${planTotal.toLocaleString("en-IN")}); added as "Unscheduled balance" — set its date.`
      : `Remaining ৳ ${c.remaining.toLocaleString("en-IN")} is less than the instalment plan (৳ ${planTotal.toLocaleString("en-IN")}); the last instalments were reduced.`);
    c.paid_by_instalment.forEach((p, i) => { const a = schedule[i]?.amount ?? 0; if (p > a && a) c.issues.push(`Instalment ${i + 1}: paid ৳ ${p.toLocaleString("en-IN")} is more than due ৳ ${a.toLocaleString("en-IN")}.`); });
  }
  if (bookedNoClient.length) warnings.push(`Marked "Booked" in the price sheet but no client details: ${bookedNoClient.join(", ")}.`);
  if (listedNoClient.length) warnings.push(`Listed in the client sheet with a price but no client name (not imported): ${listedNoClient.join(", ")}.`);

  return { projectName, bookingMoney, units, floors, bookedNoClient, listedNoClient, schedule, penaltyRate, clients, warnings };
}

export type PlanRow = { label: string; due_date: string; amount: number; paid_amount: number };
export type PlanPayment = { paid_on: string; amount: number; type: string; reference: string; note: string };

/**
 * Turns one client into instalment rows + payment rows.
 * `undatedOn` is the date the admin chose for things the sheet has no date for
 * (booking money, down payment, and the date each payment was received).
 */
export function buildClientPlan(c: ImportClient, schedule: ScheduleItem[], undatedOn: string, method: string) {
  const NOTE = "Imported from the Excel sheet. The sheet has no date for this payment; the import date is used.";
  const rows: PlanRow[] = [];
  const pays: PlanPayment[] = [];
  if (c.booking) { rows.push({ label: "Booking money", due_date: undatedOn, amount: c.booking, paid_amount: c.booking }); pays.push({ paid_on: undatedOn, amount: c.booking, type: "Booking money", reference: "Booking money", note: NOTE }); }
  if (c.down) { rows.push({ label: "Down payment", due_date: undatedOn, amount: c.down, paid_amount: c.down }); pays.push({ paid_on: undatedOn, amount: c.down, type: "Down payment", reference: "Down payment", note: NOTE }); }

  // instalment amounts follow the schedule; if the client's remaining is smaller, reduce from the end
  const amounts = schedule.map((s) => s.amount);
  let over = amounts.reduce((a, b) => a + b, 0) - c.remaining;
  for (let i = amounts.length - 1; i >= 0 && over > 0; i--) { const cut = Math.min(amounts[i]!, over); amounts[i]! -= cut; over -= cut; }
  schedule.forEach((s, i) => {
    const amount = amounts[i]!;
    const paid = c.paid_by_instalment[i] ?? 0;
    if (amount <= 0 && paid <= 0) return;
    rows.push({ label: s.label, due_date: s.due_date, amount, paid_amount: Math.min(paid, amount) });
    if (paid > 0) pays.push({ paid_on: undatedOn, amount: paid, type: "Instalment", reference: s.label, note: NOTE });
  });
  const planned = rows.reduce((t, r) => t + r.amount, 0);
  const gap = c.total_price - planned;
  if (gap > 0.5) rows.push({ label: "Unscheduled balance (from sheet) — set the date", due_date: schedule.at(-1)?.due_date ?? undatedOn, amount: gap, paid_amount: 0 });
  return { rows, pays: pays.map((p) => ({ ...p, method })) };
}

export const sizeRange = (units: { size_sft: number }[]) => {
  if (!units.length) return "";
  const f = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const lo = Math.round(Math.min(...units.map((u) => u.size_sft))), hi = Math.round(Math.max(...units.map((u) => u.size_sft)));
  return lo === hi ? `${f.format(lo)} sft` : `${f.format(lo)}–${f.format(hi)} sft`;
};
