import Hero from "@/components/Hero";
import Countdown from "@/components/Countdown";
import Story from "@/components/Story";
import TheDay from "@/components/TheDay";
import Details from "@/components/Details";
import Gallery from "@/components/Gallery";
import Rsvp from "@/components/Rsvp";
import Faq from "@/components/Faq";

export default function Home() {
  return (
    <>
      <Hero />
      <Countdown />
      <Story />
      <TheDay />
      <Details />
      <Gallery />
      <Rsvp />
      <Faq />
    </>
  );
}
