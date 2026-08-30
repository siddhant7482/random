# Images

**Nothing in this folder appears on the page.** The save-the-date is drawn in
SVG — see `components/CardArt.tsx` — so the site has no photograph in it.

| File | Status |
| --- | --- |
| `hero.jpg` | Used **only** as the link-preview image, for WhatsApp, iMessage and Facebook. Referenced from `hero.photo` in `lib/config.ts`. |
| everything else | Unused. Left over from an earlier photo-led design; safe to delete. |

## Changing the link preview

Save a square-ish image over `hero.jpg`, or point `hero.photo` in
`lib/config.ts` at a different file. Around 1200x630 is the usual size for a
social preview; anything much smaller looks soft when a chat app expands it.

The preview only works once `siteUrl` in `lib/config.ts` matches where the site
is actually deployed — it is used to turn this relative path into the absolute
URL that chat apps require.
