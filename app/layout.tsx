import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Pinyon_Script, Jost } from "next/font/google";
import { wedding } from "@/lib/config";
import "./globals.css";

/* Root layout deliberately holds nothing but the document shell, fonts and
   the palette. The invitation's chrome — nav, petals, curtain, footer — lives
   in the (site) group, so /admin can render as a plain tool without any of it. */

/* Self-hosted at build time by next/font — no CDN request, no layout shift. */
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const script = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
  display: "swap",
});

const title = `${wedding.bride} & ${wedding.groom} — ${wedding.dateLong}`;
const description = `${wedding.bride} and ${wedding.groom} are getting married in ${wedding.place}. Details, schedule and RSVP.`;

export const metadata: Metadata = {
  metadataBase: new URL(wedding.siteUrl),
  title: { default: title, template: "%s · " + `${wedding.bride} & ${wedding.groom}` },
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: wedding.hero.photo }],
  },
  /* No `icons` entry on purpose. Next picks up app/favicon.ico, app/icon.png
     and app/apple-icon.png by file convention and emits the right tags with
     cache-busting hashes; naming them here would override that with plain,
     unhashed paths. Regenerate them with `npm run icons`. */
};

export const viewport: Viewport = {
  themeColor: "#fbf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
