import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteChrome";
import { ContactCTA, Location } from "@/components/HomeSections";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Natec Development Ltd." },
      { name: "description", content: "Call, WhatsApp or visit Natec Development at Rajendrapur Bazar, Sreepur, Gazipur." },
      { property: "og:title", content: "Contact Natec Development Ltd." },
      { property: "og:description", content: "Let's discuss your land, design or construction project." },
    ],
  }),
  component: () => <UnderConstruction title="Contact" real={ContactPage} />,
});

export function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact us" title="Let's discuss your new home." intro="Call, WhatsApp or send an inquiry — our team in Sreepur will get back to you." />
      <ContactCTA />
      <Location />
    </>
  );
}
