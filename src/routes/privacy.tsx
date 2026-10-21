import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy | Natec Development Ltd." },
    { name: "description", content: "Privacy Policy for the Natec Development Ltd. website and customer accounts." },
    { property: "og:title", content: "Privacy Policy | Natec Development Ltd." },
    { property: "og:description", content: "Privacy Policy for the Natec Development Ltd. website and customer accounts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <section className="bg-ivory px-5 pb-24 pt-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-brand-red">Legal</p>
        <h1 className="mt-3 text-primary">Privacy Policy</h1>
        <p className="mt-6 text-muted-foreground">[Privacy Policy text — to be provided by Natec Development Ltd.]</p>
      </div>
    </section>
  ),
});
