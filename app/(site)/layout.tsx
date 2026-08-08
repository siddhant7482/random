import SvgDefs from "@/components/SvgDefs";
import Curtain from "@/components/Curtain";
import Petals from "@/components/Petals";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/**
 * Everything that makes the invitation feel like an invitation.
 *
 * A route group, so the URL is still "/" — it exists purely to keep this
 * chrome off /admin, which shares the fonts and palette but nothing else.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SvgDefs />
      <Curtain />
      <Petals />
      <Nav />
      <main id="top">{children}</main>
      <Footer />
    </>
  );
}
