/**
 * XML sitemaps in the style of Rank Math: a sitemap index plus one sitemap per content type,
 * each rendered for people with an XSL stylesheet (/main-sitemap.xsl) in Natec's brand colours.
 * Search engines ignore the stylesheet and read the plain XML.
 */
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "./site";
import type { Database } from "@/integrations/supabase/types";

export type SitemapUrl = { loc: string; lastmod?: string | null; images?: { loc: string; title?: string | null }[] };
export type SitemapRef = { loc: string; lastmod?: string | null };

/** Public pages. Private areas (/admin, /account, auth pages) are never listed. */
export const STATIC_PAGES: { path: string; lastmod?: string }[] = [
  { path: "/" },
  { path: "/about" },
  { path: "/projects" },
  { path: "/construction-status" },
  { path: "/floor-plan" },
  { path: "/location" },
  { path: "/services" },
  { path: "/directors" },
  { path: "/contact" },
  { path: "/privacy" },
  { path: "/terms" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);
const iso = (d?: string | null) => (d ? new Date(d).toISOString() : null);
const HEAD = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n`;

export function sitemapIndexXml(refs: SitemapRef[]) {
  const items = refs.map((r) => `\t<sitemap>\n\t\t<loc>${esc(abs(r.loc))}</loc>${r.lastmod ? `\n\t\t<lastmod>${iso(r.lastmod)}</lastmod>` : ""}\n\t</sitemap>`).join("\n");
  return `${HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function urlsetXml(urls: SitemapUrl[]) {
  const items = urls.map((u) => {
    const imgs = (u.images ?? []).map((i) => `\n\t\t<image:image>\n\t\t\t<image:loc>${esc(abs(i.loc))}</image:loc>${i.title ? `\n\t\t\t<image:title>${esc(i.title)}</image:title>` : ""}\n\t\t</image:image>`).join("");
    return `\t<url>\n\t\t<loc>${esc(abs(u.loc))}</loc>${u.lastmod ? `\n\t\t<lastmod>${iso(u.lastmod)}</lastmod>` : ""}${imgs}\n\t</url>`;
  }).join("\n");
  return `${HEAD}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export function xmlResponse(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600",
      "x-robots-tag": "noindex, follow",
    },
  });
}

function publicDb() {
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || process.env["SUPABASE_URL"];
  const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type SitemapProject = {
  slug: string; name: string; kind: string; updated_at: string | null; status_updated_at: string | null;
  status_details_published: boolean; progress_pct: number;
  images: { loc: string; title: string | null }[];
};

/** Published projects with their images (public data only, read with the anon key). */
export async function loadSitemapProjects(): Promise<SitemapProject[]> {
  const db = publicDb();
  if (!db) return [];
  const [p, m] = await Promise.all([
    db.from("projects").select("id, slug, name, kind, updated_at, status_updated_at, status_details_published, progress_pct, cover_media_id").eq("published", true).order("sort_order"),
    db.from("media").select("id, public_url, title, alt_text, project_id").not("project_id", "is", null),
  ]);
  if (p.error) { console.error("sitemap projects", p.error.message); return []; }
  const media = m.data ?? [];
  return (p.data ?? []).map((x) => {
    const imgs = media.filter((i) => i.project_id === x.id);
    const cover = imgs.find((i) => i.id === x.cover_media_id);
    const ordered = cover ? [cover, ...imgs.filter((i) => i !== cover)] : imgs;
    return {
      slug: x.slug, name: x.name, kind: x.kind, updated_at: x.updated_at, status_updated_at: x.status_updated_at,
      status_details_published: x.status_details_published, progress_pct: x.progress_pct,
      images: ordered.filter((i) => i.public_url).map((i) => ({ loc: i.public_url, title: i.title || i.alt_text || x.name })),
    };
  });
}

export const latest = (dates: (string | null | undefined)[]) =>
  dates.filter(Boolean).sort().at(-1) ?? null;

export const listedInConstruction = (p: Pick<SitemapProject, "kind" | "status_details_published" | "progress_pct">) =>
  p.kind !== "upcoming" || p.status_details_published || p.progress_pct > 0;

/** Build date of this deploy, used as lastmod for static pages. */
export const BUILD_TIME = new Date().toISOString();
