import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authpage/register")({
  head: () => ({
    meta: [
      { title: "Register — Natec Development Ltd." },
      { name: "description", content: "Create a Natec Development account to save projects, get updates and book site visits." },
      { property: "og:title", content: "Register — Natec Development Ltd." },
      { property: "og:description", content: "Create a Natec Development account to save projects, get updates and book site visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
