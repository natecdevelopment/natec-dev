import { createFileRoute } from "@tanstack/react-router";
import { listedInConstruction, loadSitemapProjects, urlsetXml, xmlResponse } from "@/lib/sitemap";

export const Route = createFileRoute("/construction-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const projects = (await loadSitemapProjects()).filter(listedInConstruction);
        return xmlResponse(urlsetXml(projects.map((p) => ({ loc: `/construction-status/${p.slug}`, lastmod: p.status_updated_at ?? p.updated_at, images: p.images.slice(0, 1) }))));
      },
    },
  },
});
