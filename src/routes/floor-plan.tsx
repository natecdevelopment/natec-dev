import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "@/components/UnderConstruction";
import { PageHero } from "@/components/SiteChrome";
import { FloorPlan } from "@/components/HomeSections";

export const Route = createFileRoute("/floor-plan")({
  head: () => ({
    meta: [
      { title: "Floor Plan — Natec Development Ltd." },
      { name: "description", content: "A sample 3-bedroom Natec home: living, dining, fitted kitchen and two balconies." },
      { property: "og:title", content: "Floor Plan — Natec Development Ltd." },
      { property: "og:description", content: "A home planned around family life in Sreepur, Gazipur." },
    ],
  }),
  component: () => <UnderConstruction title="Floor Plan" real={FloorPlanPage} />,
});

function FloorPlanPage() {
  return (
    <>
      <PageHero eyebrow="Floor plan" title="A home planned around family life." />
      <FloorPlan />
    </>
  );
}
