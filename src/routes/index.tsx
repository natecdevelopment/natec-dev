import { createFileRoute } from "@tanstack/react-router";
import { CinematicHero } from "@/components/CinematicHero";
import { Intro, ProjectsShowcase, FloorPlan, WhyNatec, HowWeBuild, Location, Board, ContactCTA } from "@/components/HomeSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Natec Development Ltd. — Homes in Sreepur, Gazipur" },
      { name: "description", content: "Natec Development Ltd. builds well-planned homes in Sreepur, Gazipur — from bare land to lasting homes, built floor by floor." },
      { property: "og:title", content: "Natec Development Ltd. — Homes in Sreepur, Gazipur" },
      { property: "og:description", content: "From bare land to lasting homes. Residential projects in Sreepur, Gazipur, Bangladesh." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <CinematicHero />
      <Intro />
      <ProjectsShowcase />
      <FloorPlan />
      <WhyNatec />
      <HowWeBuild />
      <Location />
      <Board />
      <ContactCTA />
    </>
  );
}
