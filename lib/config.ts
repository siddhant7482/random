/* ============================================================
   EDIT EVERYTHING HERE.
   Names, dates, the hero photo — all of it.
   You should never need to open another file to change wording.
   ============================================================ */

export const wedding = {
  /* — the couple — */
  bride: "Ayushi",
  groom: "Romil",
  hashtag: "#AyushiAndRomil",
  email: "hello@ayushiandromil.com",

  /* Where the site will live. Only used to build absolute URLs for the
     WhatsApp / iMessage / Facebook link preview — update it once you deploy. */
  siteUrl: "https://ayushiandromil.example",

  /* — the date —
     ISO format: YYYY-MM-DDTHH:MM:SS  (24h, local time)
     This drives the countdown, the <title> and the schedule heading. */
  dateISO: "2026-12-09T17:00:00",
  dateLong: "Wednesday, December 9, 2026",
  dateShort: "09 · 12 · 2026",
  place: "Panchkula, Haryana",

  /* — RSVP —
     Replies post to this site's own /api/rsvp, which stores them and emails
     both you and the guest. Nothing to configure here; the storage and mail
     settings are environment variables. See README.md. */
  rsvpDeadline: "10 November 2026",

  /* — hero —
     The card is drawn, not photographed: an engraved medallion of the two
     cities inside a floral wreath. `photo` is no longer on the page — it is
     kept only as the image for WhatsApp and iMessage link previews. */
  hero: {
    eyebrow: "Save the date",
    tagline: "Two cities. One journey. A lifetime of togetherness and love.",
    /* The two places the illustration pairs, left to right. */
    cities: ["Chandigarh", "Panchkula"],
    photo: "/images/hero.jpg",
    photoAlt: "Ayushi and Romil",
  },
} as const;

/* ============================================================
   NAV
   The page is now hero, countdown and RSVP only, so there is nowhere to
   jump to — the bar keeps just the monogram and the RSVP button. Add
   entries here and the links (and the mobile menu) come back on their own.
   ============================================================ */

export const navLinks: { label: string; href: string }[] = [];
