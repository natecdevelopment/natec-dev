import { describe, expect, it } from "vitest";
import { listedInConstruction, sitemapIndexXml, urlsetXml } from "./sitemap";

describe("sitemaps", () => {
  it("builds a sitemap index on the live domain with the stylesheet", () => {
    const xml = sitemapIndexXml([{ loc: "/page-sitemap.xml", lastmod: "2026-10-21T10:00:00Z" }]);
    expect(xml).toContain('<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>');
    expect(xml).toContain("<loc>https://natecdev.com/page-sitemap.xml</loc>");
    expect(xml).toContain("<lastmod>2026-10-21T10:00:00.000Z</lastmod>");
  });
  it("builds a urlset with images and escapes text", () => {
    const xml = urlsetXml([{ loc: "/projects/shobuj-digonto", lastmod: "2026-10-01", images: [{ loc: "https://cdn.example.com/a.webp", title: "Shobuj Digonto & more" }] }]);
    expect(xml).toContain("<loc>https://natecdev.com/projects/shobuj-digonto</loc>");
    expect(xml).toContain("<image:loc>https://cdn.example.com/a.webp</image:loc>");
    expect(xml).toContain("<image:title>Shobuj Digonto &amp; more</image:title>");
  });
  it("lists construction pages like the site does", () => {
    expect(listedInConstruction({ kind: "current", status_details_published: false, progress_pct: 0 })).toBe(true);
    expect(listedInConstruction({ kind: "upcoming", status_details_published: false, progress_pct: 0 })).toBe(false);
  });
});
