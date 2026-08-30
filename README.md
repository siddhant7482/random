# Ayushi & Romil — wedding site

An ivory-and-navy wedding site built to match the save-the-date card: wide-tracked
serif capitals, gold calligraphy, and an engraved medallion — a floral wreath
around the two cities the couple come from — all of it drawn in SVG rather
than photographed.

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules · Motion.

---

## Running it

```bash
npm install     # first time only
npm run dev     # http://localhost:3000
```

Other commands: `npm run build` (production build), `npm start` (serve the
build), `npm run lint`.

---

## Changing the content

**`lib/config.ts` is the only file you need.** The names, the date, the place,
the hero wording and the RSVP deadline all live there in plain English. Nothing
in it requires knowing React.

The one field to get right is the date:

```ts
dateISO: "2026-12-10T17:00:00",   // YYYY-MM-DDTHH:MM:SS, 24-hour, local time
```

It drives the countdown and the page title. `dateLong` and `dateShort` are what
guests actually read, so keep those in step with it.

### What's on the page

Three sections: the hero, the countdown, and the RSVP form — plus a slim nav
and a footer.

Earlier versions also had Our Story, The Day, Details, a Gallery and an FAQ.
Those were removed. If you want any of them back, they're in the git history:
`git log --oneline` and look before the "Trim the site" commit.

Because there is nowhere left to jump to, the nav carries only the monogram and
the RSVP button, and the mobile hamburger is gone. Add entries to `navLinks` in
the config and both the links and the mobile menu return on their own.

---

## Artwork

There is no photograph on the page. The card is drawn in
[`components/CardArt.tsx`](components/CardArt.tsx): the crown arc, the fleuron
rules, the two-city scene, and the wreath.

The wreath is generated rather than listed out — `buildRing()` walks the circle
placing roses at four anchors and filling between them with leaves, cosmos,
sprigs and berries. It is deterministic, so the server and the browser draw the
same wreath and nothing shifts on hydration. To make it fuller or sparser,
change `STEP`; to move the roses, change `ROSE_AT`.

`public/images/hero.jpg` is still there but is **not on the page** — it is only
the image used for WhatsApp and iMessage link previews. The other files in that
folder are unused.

---

## RSVPs, the dashboard and notifications

Replies post to this site's own `/api/rsvp`, which:

1. validates them **on the server** (the browser checks are only for
   helpfulness — they can be bypassed),
2. saves them,
3. emails a confirmation to the guest **and** an alert to you.

You read them at **`/admin`** — a dashboard with counts, a searchable list,
filters and a CSV download.

There's also a hidden honeypot field on the form. Real guests never see it;
bots fill everything, and any reply with it set is silently discarded.

### Signing in

The first time you open `/admin` it walks you through creating an account:
email, password, and two-factor with an authenticator app. **That page closes
permanently once the first account exists**, so open it yourself as soon as you
deploy — before you share the link with anyone.

You'll be shown eight recovery codes once. Save them. They're the only way back
in if you lose your phone.

### What protects the guest list

| | |
| --- | --- |
| **Passwords** | scrypt, memory-hard, ~100ms per attempt. Parameters are stored with each hash, so they can be raised later without invalidating anyone. |
| **Two-factor** | Mandatory, set up during account creation — an account that can be made without it is one that will run without it. The password step issues no cookie at all, so a stolen password alone gets nowhere. |
| **Code replay** | Each TOTP code is burned after use. Shoulder-surfing one inside its 30-second window doesn't help. |
| **Sessions** | Server-side. The cookie holds a random 256-bit token; the database stores only its SHA-256, so a leaked database can't be replayed as a login. HttpOnly, Secure, SameSite=Strict. |
| **Timeouts** | 45 minutes idle, 12 hours absolute, whichever comes first. Tokens rotate every 15 minutes. |
| **Lost laptop** | "Sign out other devices" kills every other session server-side — something a cookie-only scheme cannot do. |
| **Brute force** | Locks out after 5 failures, with the delay doubling each time up to 30 minutes. Limited per account *and* per IP, so neither one inbox nor one attacker can grind away. |
| **Enumeration** | Unknown and known emails return the same message, the same status, and take the same time — a hash is computed either way. |
| **CSRF** | SameSite=Strict plus an Origin check on every state-changing request. |
| **Headers** | CSP, HSTS, `frame-ancestors 'none'`, nosniff, referrer and permissions policy, set in `proxy.ts`. The admin area gets a stricter CSP (`script-src 'self'`, no inline) and `no-store`. |
| **Audit** | Sign-ins, failures, sign-outs, session revocations and CSV exports are all recorded with time and IP, and shown under **Security** on the dashboard. |

Two honest limitations. The admin CSP is stricter than the public pages', which
still allow inline script — Next needs it to hydrate a statically generated
page, and a nonce would force every page to render dynamically. And a shared
password is gone, but the account is still a single shared login; if more than
one of you needs access, give each person their own by adding accounts.

### It works with nothing configured

Run `npm run dev` and the whole flow works immediately — replies go to
`.data/rsvps.json` and no email is sent. The dashboard shows a banner for each
of those, so you always know what's switched on.

**Before real guests use it you must set `DATABASE_URL`.** Serverless
filesystems are read-only and wiped between requests, so the file store would
lose every reply in production.

---

## Putting it online, free

Three services, all on free tiers, about twenty minutes.

### 1. A database — [Neon](https://neon.com)

Free Postgres, 0.5 GB, no card. Create a project and copy the **pooled**
connection string (the host has `-pooler` in it). That's your `DATABASE_URL`.

Supabase, Railway or Vercel Postgres work identically — any Postgres URL is
fine. The table is created automatically on first use; there's no migration to
run.

### 2. Email — [Brevo](https://brevo.com)

300 emails a day free. Crucially, Brevo lets you verify **a single ordinary
address** — an existing Gmail is fine — so guest confirmations work without
buying a domain.

Sign up, verify your address, create an API key. That's `BREVO_API_KEY`, and
`MAIL_FROM_EMAIL` is the address you verified.

> [Resend](https://resend.com) is the other supported option and has better
> deliverability, but it will only send to other people once you've verified a
> domain you own. If you have a domain, prefer it; if not, use Brevo.

### 3. Hosting — [Vercel](https://vercel.com)

```bash
npx vercel        # from this folder, then follow the prompts
```

Then in **Settings → Environment Variables**, add the keys from
[`.env.example`](.env.example) and redeploy. At minimum:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Without it you will lose replies **and your login** |
| `BREVO_API_KEY` + `MAIL_FROM_EMAIL` | Turns emails on |
| `COUPLE_NOTIFY_EMAIL` | Where your alerts go |

There is no admin password variable — you create the account through the site
itself, the first time you open `/admin`.

Vercel's free Hobby plan is for personal projects, which a wedding site is.

Once you have a domain, update `siteUrl` in `lib/config.ts` — that's what makes
the photo and title appear when someone shares the link on WhatsApp.

### Checking it worked

Open the deployed site, send yourself an RSVP, then visit `/admin`. You should
see the reply listed, a confirmation in the guest's inbox, an alert in yours,
and **no warning banners** on the dashboard.

---

## Notes on the animations

Everything is built to degrade rather than break:

- **`prefers-reduced-motion`** is respected throughout. Guests with it enabled
  get no petals, no opening curtain, no parallax, no glints or pulsing glows,
  and content that's simply visible rather than fading in — the site still
  reads perfectly.
- **The petal canvas** carries two kinds of particle: petals that fall, and
  warm light motes that rise. It scales its count to the viewport (capped at 26
  on phones, 54 on desktop), caps device pixel ratio at 2, blits the mote glow
  from one pre-rendered sprite rather than building a gradient per mote per
  frame, and stops entirely when the tab is in the background.
- **The light effects** are all compositor-friendly — transform and opacity
  only, no per-frame layout. There's a gold glint that travels across the
  calligraphy, a drifting ambient wash behind the page, a halo behind the hero
  portrait, a pool of light under the countdown, and warm bloom on the detail
  cards on hover.
- **The opening curtain** plays once per browser tab, remembered in
  `sessionStorage`. Guests coming back for a fourth look skip it.
- **Scroll reveals** use IntersectionObserver via Motion's `whileInView`, fire
  once, and never re-run.
- **The line-drawn florals** work by animating `stroke-dashoffset` on paths that
  all declare `pathLength="1"`, so a long stem and a short leaf take the same
  time to draw regardless of their real geometry.

## Where things live

```
app/
  layout.tsx          document shell, fonts, palette — nothing else
  globals.css         tokens, type scale, shared classes
  (site)/
    layout.tsx        nav, petals, curtain, footer (the invitation's chrome)
    page.tsx          section order — rearrange the site here
  admin/              the RSVP dashboard and its sign-in gate
  api/
    rsvp/             receives replies, saves them, sends both emails
    admin/session/    sign in and out
    admin/export/     CSV download
components/           one component + one CSS module each
lib/
  config.ts           ← all your content
  rsvp-store.ts       Postgres in production, JSON file in dev
  mail.ts             Brevo / Resend over plain fetch, no dependency
  admin-auth.ts       password → signed cookie
  rich.tsx            the tiny **bold** / _italic_ formatter
scripts/
  generate-icons.mjs
public/images/        your photos
```

`(site)` is a route group — the brackets mean it doesn't appear in the URL. It
exists so `/admin` can render as a plain tool without the petals, curtain and
footer.

