/**
 * Minimal .xlsx reader for the browser (no dependency).
 * An .xlsx file is a zip of XML parts; we read the central directory, inflate the
 * parts we need with DecompressionStream("deflate-raw"), and parse them with DOMParser.
 * Returns every sheet as a 2-D array of cell values (string | number | null).
 */
export type Cell = string | number | null;
export type Workbook = { sheetNames: string[]; sheets: Record<string, Cell[][]> };

type Entry = { name: string; method: number; compSize: number; localOffset: number };

function readEntries(buf: ArrayBuffer): Entry[] {
  const v = new DataView(buf);
  // End of central directory: scan back from the end for 0x06054b50.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This file is not a valid .xlsx (zip) file.");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: Entry[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Corrupt .xlsx file.");
    const method = v.getUint16(p + 10, true);
    const compSize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const localOffset = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    out.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readPart(buf: ArrayBuffer, e: Entry): Promise<string> {
  const v = new DataView(buf);
  const nameLen = v.getUint16(e.localOffset + 26, true);
  const extraLen = v.getUint16(e.localOffset + 28, true);
  const start = e.localOffset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buf, start, e.compSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error(`Unsupported compression in ${e.name}.`);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

const parseXml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const els = (root: Document | Element, tag: string) => Array.from(root.getElementsByTagNameNS("*", tag));

function colIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(file: Blob): Promise<Workbook> {
  const buf = await file.arrayBuffer();
  const entries = readEntries(buf);
  const byName = new Map(entries.map((e) => [e.name.replace(/^\//, ""), e]));
  const part = async (path: string) => {
    const e = byName.get(path);
    return e ? parseXml(await readPart(buf, e)) : null;
  };

  const wb = await part("xl/workbook.xml");
  const rels = await part("xl/_rels/workbook.xml.rels");
  if (!wb || !rels) throw new Error("This file does not look like an Excel workbook.");

  const shared: string[] = [];
  const sst = await part("xl/sharedStrings.xml");
  if (sst) for (const si of els(sst, "si")) shared.push(els(si, "t").map((t) => t.textContent ?? "").join(""));

  const relTarget = new Map(els(rels, "Relationship").map((r) => [r.getAttribute("Id") ?? "", r.getAttribute("Target") ?? ""]));
  const sheetNames: string[] = [];
  const sheets: Record<string, Cell[][]> = {};

  for (const s of els(wb, "sheet")) {
    const name = s.getAttribute("name") ?? `Sheet${sheetNames.length + 1}`;
    const rid = s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "";
    let target = relTarget.get(rid) ?? "";
    target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const doc = await part(target);
    sheetNames.push(name);
    const rows: Cell[][] = [];
    if (doc) {
      for (const row of els(doc, "row")) {
        const r = Number(row.getAttribute("r") ?? rows.length + 1) - 1;
        const cells: Cell[] = [];
        for (const c of els(row, "c")) {
          const idx = colIndex(c.getAttribute("r") ?? "A1");
          const t = c.getAttribute("t");
          const vEl = els(c, "v")[0];
          let val: Cell = null;
          if (t === "s") val = vEl ? shared[Number(vEl.textContent)] ?? null : null;
          else if (t === "inlineStr") val = els(c, "t").map((x) => x.textContent ?? "").join("");
          else if (t === "str" || t === "e") val = vEl?.textContent ?? null;
          else if (t === "b") val = vEl ? Number(vEl.textContent) : null;
          else if (vEl && vEl.textContent !== "") { const n = Number(vEl.textContent); val = Number.isFinite(n) ? n : vEl.textContent; }
          cells[idx] = typeof val === "string" ? val.trim() || null : val;
        }
        rows[r] = Array.from(cells, (x) => (x === undefined ? null : x));
      }
    }
    sheets[name] = Array.from(rows, (r) => r ?? []);
  }
  return { sheetNames, sheets };
}
