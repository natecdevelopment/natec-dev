import { createFileRoute } from "@tanstack/react-router";
import { loadSitemapProjects, urlsetXml, xmlResponse } from "@/lib/sitemap";

export const Route = createFileRoute("/project-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const projects = await loadSitemapProjects();
        return xmlResponse(urlsetXml(projects.map((p) => ({ loc: `/projects/${p.slug}`, lastmod: p.updated_at, images: p.images }))));
      },
    },
  },
});
