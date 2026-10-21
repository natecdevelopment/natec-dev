import { createFileRoute } from "@tanstack/react-router";
import { BUILD_TIME, latest, listedInConstruction, loadSitemapProjects, sitemapIndexXml, xmlResponse } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap_index.xml")({
  server: {
    handlers: {
      GET: async () => {
        const projects = await loadSitemapProjects();
        const refs = [
          { loc: "/page-sitemap.xml", lastmod: BUILD_TIME },
          ...(projects.length ? [{ loc: "/project-sitemap.xml", lastmod: latest(projects.map((p) => p.updated_at)) }] : []),
          ...(projects.some(listedInConstruction) ? [{ loc: "/construction-sitemap.xml", lastmod: latest(projects.filter(listedInConstruction).map((p) => p.status_updated_at ?? p.updated_at)) }] : []),
        ];
        return xmlResponse(sitemapIndexXml(refs));
      },
    },
  },
});
