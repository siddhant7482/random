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
  dateISO: "2026-12-10T17:00:00",
  dateLong: "Thursday, December 10, 2026",
  dateShort: "10 · 12 · 2026",
  place: "Chandigarh, Punjab",

  /* — RSVP —
     Replies post to this site's own /api/rsvp, which stores them and emails
     both you and the guest. Nothing to configure here; the storage and mail
     settings are environment variables. See README.md. */
  rsvpDeadline: "10 November 2026",

  /* — hero —
     `focus` is CSS object-position. The photo is cropped to fill the torn
     shape, so nudge this if faces drift out of frame. */
  hero: {
    eyebrow: "Save the date",
    accent: "we can't wait to celebrate with you",
    photo: "/images/hero.jpg",
    photoAlt: "Ayushi and Romil on the beach at sunset",
    focus: "50% 45%",
  },
} as const;

/* ============================================================
   NAV
   The page is now hero, countdown and RSVP only, so there is nowhere to
   jump to — the bar keeps just the monogram and the RSVP button. Add
   entries here and the links (and the mobile menu) come back on their own.
   ============================================================ */

export const navLinks: { label: string; href: string }[] = [];
