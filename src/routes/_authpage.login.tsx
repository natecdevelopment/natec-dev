import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authpage/login")({
  head: () => ({
    meta: [
      { title: "Login — Natec Development Ltd." },
      { name: "description", content: "Log in to your Natec Development account to track construction, payments and saved projects." },
      { property: "og:title", content: "Login — Natec Development Ltd." },
      { property: "og:description", content: "Log in to your Natec Development account to track construction, payments and saved projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
