import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "@/components/UnderConstruction";
import { PageHero } from "@/components/SiteChrome";
import { Location } from "@/components/HomeSections";

export const Route = createFileRoute("/location")({
  head: () => ({
    meta: [
      { title: "Location — Natec Development Ltd." },
      { name: "description", content: "Find Natec Development at Rajendrapur Bazar, Sreepur, Gazipur, near the Dhaka–Mymensingh Highway." },
      { property: "og:title", content: "Location — Natec Development Ltd." },
      { property: "og:description", content: "Rajendrapur Bazar, Sreepur, Gazipur — close to schools, markets and the highway." },
    ],
  }),
  component: () => <UnderConstruction title="Location" real={LocationPage} />,
});

function LocationPage() {
  return (
    <>
      <PageHero eyebrow="Location" title="Rajendrapur Bazar, Sreepur, Gazipur." />
      <Location />
    </>
  );
}
