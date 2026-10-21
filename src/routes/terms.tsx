import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Use | Natec Development Ltd." },
    { name: "description", content: "Terms of Use for the Natec Development Ltd. website and customer accounts." },
    { property: "og:title", content: "Terms of Use | Natec Development Ltd." },
    { property: "og:description", content: "Terms of Use for the Natec Development Ltd. website and customer accounts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <section className="bg-ivory px-5 pb-24 pt-36">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-brand-red">Legal</p>
        <h1 className="mt-3 text-primary">Terms of Use</h1>
        <p className="mt-6 text-muted-foreground">[Terms of Use text — to be provided by Natec Development Ltd.]</p>
      </div>
    </section>
  ),
});
