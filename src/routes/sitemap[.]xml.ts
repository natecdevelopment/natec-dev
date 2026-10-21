import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

// Like Rank Math: /sitemap.xml points to the sitemap index.
export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: async () => Response.redirect(`${SITE_URL}/sitemap_index.xml`, 301) } },
});
