/* ============================================================
   EDIT EVERYTHING HERE.
   Names, dates, venues, schedule, FAQ, photos — all of it.
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
   OUR STORY
   Placeholder wording — swap in your own.
   ============================================================ */

export const story = [
  {
    year: "2019",
    title: "Where it began",
    body: "A mutual friend's birthday dinner in Sector 26, a table that was two chairs short, and a conversation that ran until the restaurant started stacking the other chairs. Neither of us noticed the place had emptied.",
    photo: "/images/story-1.jpg",
    alt: "Sitting together in a meadow",
  },
  {
    year: "2022",
    title: "The one with the wrong turn",
    body: "We meant to drive up to Kasauli for the afternoon. Somewhere past Parwanoo we took a wrong turn and ended up watching the sun go down from a roadside dhaba instead. Still the best day either of us can remember.",
    photo: "/images/story-2.jpg",
    alt: "Pointing out the moon on a cloudy evening",
  },
  {
    year: "2026",
    title: "A question in the Rock Garden",
    body: "No crowd, no plan, no speech prepared — just a walk we'd taken a hundred times before, a ring box hidden badly, and a yes before the question was finished.",
    photo: "/images/story-3.webp",
    alt: "Watching the sun go down by the water",
  },
];

/* ============================================================
   THE DAY
   ============================================================ */

export const dayIntro = "Hotel Mountview, Sector 10 · Chandigarh";

export const schedule = [
  {
    time: "5:00 pm",
    title: "Guests arrive",
    body: "High tea on the lawns. There are heaters, and shawls if you need one.",
  },
  {
    time: "6:00 pm",
    title: "Baraat & Milni",
    body: "The baraat reaches the gate. Please join the families for the milni.",
  },
  {
    time: "7:00 pm",
    title: "Jaimala",
    body: "The varmala ceremony on the main stage.",
  },
  {
    time: "8:00 pm",
    title: "Dinner & dancing",
    body: "Dinner is served through the evening — no need to wait for a call.",
  },
  {
    time: "10:30 pm",
    title: "Pheras",
    body: "The wedding ceremony begins in the mandap. Do come and sit with us.",
  },
  {
    time: "1:00 am",
    title: "Vidaai",
    body: "Cars are arranged from the porch for anyone heading back into town.",
  },
];

/* ============================================================
   DETAILS CARDS
   `icon` picks the line drawing — one of:
   "pin" | "dress" | "bed" | "clock" | "gift" | "heart"
   ============================================================ */

export const details = [
  {
    icon: "pin" as const,
    title: "Where",
    body: [
      "**Wedding & reception**\nHotel Mountview, Sector 10,\nChandigarh 160011",
      "**Mehendi & Sangeet**\nThe Lalit, Sector 26,\nChandigarh 160019",
    ],
    link: {
      label: "Open in maps",
      href: "https://maps.google.com/?q=Hotel+Mountview+Sector+10+Chandigarh",
    },
  },
  {
    icon: "heart" as const,
    title: "The other functions",
    body: [
      "**Tuesday 8 December** — Mehendi, 4:00 pm onwards",
      "**Wednesday 9 December** — Haldi in the morning, Sangeet from 7:00 pm",
      "_Everyone on your invitation is welcome at all three days._",
    ],
  },
  {
    icon: "dress" as const,
    title: "What to wear",
    body: [
      "Indian festive. Bright, comfortable, and warm enough to sit outdoors after dark.",
      "December in Chandigarh drops to around 5°C at night. The lawns are heated, but a shawl or a jacket over your outfit is a very good idea.",
      "_Our colours are ivory, deep navy, sage and gold, if you'd like to lean into it._",
    ],
  },
  {
    icon: "bed" as const,
    title: "Staying over",
    body: [
      "We have held rooms at two hotels until **1 November 2026**.",
      "**Hotel Mountview, Sector 10** — quote _AYUSHI-ROMIL_\n**Hotel Shivalikview, Sector 17** — quote _A&R 2026_",
    ],
    link: { label: "Tell us if you need a room", href: "#rsvp" },
  },
  {
    icon: "clock" as const,
    title: "Getting there",
    body: [
      "**By air** — Chandigarh airport (IXC) is about 30 minutes from Sector 10.",
      "**By train** — Vande Bharat and Shatabdi from New Delhi take a little over three hours to Chandigarh Junction.",
      "Parking at the venue is free. Cars can stay overnight.",
    ],
  },
  {
    icon: "gift" as const,
    title: "Blessings & gifts",
    body: [
      "Your presence and your blessings are genuinely all we want.",
      "If you would still like to give something, we're putting a little aside towards our first home.",
      "Any questions at all, please just ask — we'd far rather answer twice than have you wondering.",
    ],
    link: { label: "hello@ayushiandromil.com", href: "mailto:hello@ayushiandromil.com" },
  },
];

/* ============================================================
   GALLERY
   Drop files in public/images/ and list them here.
   size: "tall" | "wide" | undefined  — controls the mosaic.
   ============================================================ */

/* Laid out as a scattered set of prints. `caption` is the handwritten line in
   the white band under each photo — keep them to three or four words; they're
   what gives the section its sense of a journey without turning it into a
   second timeline. `shape` sets the crop: "tall" | "wide" | "square". */
export const gallery = [
  {
    src: "/images/story-1.jpg",
    alt: "An afternoon in the long grass",
    caption: "where it began",
    shape: "square" as const,
  },
  {
    src: "/images/story-2.jpg",
    alt: "Pointing out the moon",
    caption: "the long way home",
    shape: "tall" as const,
  },
  {
    src: "/images/hero.jpg",
    alt: "On the beach at sunset",
    caption: "somewhere near the sea",
    shape: "wide" as const,
  },
  {
    src: "/images/story-3.webp",
    alt: "Sunset by the water",
    caption: "and then, the question",
    shape: "tall" as const,
  },
];

/* The two handwritten notes tucked among the prints, and the little stamp
   printed down the side. Short is better — these are marginalia. */
export const galleryNotes = {
  first: "from one rainy evening\nto all of this",
  second: "and everything\nstill ahead of us",
  stamp: "10 . 12 . 26",
};

/* ============================================================
   FAQ
   ============================================================ */

export const faq = [
  {
    q: "Can I bring a plus one?",
    a: "Your invitation names everyone we've saved a seat for. If you're unsure, or something has changed, please just ask — we would much rather sort it out than have you guess.",
  },
  {
    q: "Are children welcome?",
    a: "Very much so. There'll be a warm indoor room set aside with games and space to nap from 8pm. Do tell us their ages on your RSVP so we can plan food.",
  },
  {
    q: "How cold does it actually get?",
    a: "Chandigarh in December runs from about 5°C at night to 20°C in the afternoon, with foggy mornings. The evening functions are outdoors with heaters — bring something warm to layer over your outfit and you'll be perfectly comfortable.",
  },
  {
    q: "Is the venue accessible?",
    a: "Yes. Both venues are step-free with lifts and accessible washrooms, and the lawns have a paved path to the mandap. Let us know on your RSVP and we'll arrange a car between the gate and the stage.",
  },
  {
    q: "Can I take photos?",
    a: "Please do, all evening. The one thing we'd ask is phones away during the pheras — we'd love to look out and see faces rather than screens. Everything else, share it to #AyushiAndRomil.",
  },
  {
    q: "What about travel between the functions?",
    a: "The two venues are about fifteen minutes apart. We'll run shuttles from Hotel Mountview before and after each function — timings will go out on WhatsApp the week before.",
  },
];

/* ============================================================
   NAV
   ============================================================ */

export const navLinks = [
  { label: "Our Story", href: "#story" },
  { label: "The Day", href: "#day" },
  { label: "Details", href: "#details" },
  { label: "Gallery", href: "#gallery" },
  { label: "FAQ", href: "#faq" },
];
