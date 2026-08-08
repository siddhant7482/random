# Photos

## What's here now

| File           | Used for                                   |
| -------------- | ------------------------------------------ |
| `hero.jpg`     | The big torn-edge portrait + gallery (wide) |
| `story-1.jpg`  | Our Story — first entry + gallery           |
| `story-2.jpg`  | Our Story — second entry + gallery (tall)   |
| `story-3.webp` | Our Story — third entry + gallery           |

There are four photos and seven slots, so each one appears twice — once in its
section and once in the gallery. Add more files and give each slot its own, and
the repetition goes away.

## Replacing one

Save your photo over the file of the same name and you're done — no code change
needed, as long as the extension matches. If you save a `.jpg` over a `.webp`
(or vice versa), update the path in `lib/config.ts` too.

## Best shapes

| Slot          | Shape            |
| ------------- | ---------------- |
| Hero          | **Square** (1:1) |
| Story entries | Portrait (4:5)   |
| Gallery tall  | Portrait         |
| Gallery wide  | Landscape        |

Photos are cropped to **fill** their slot, so anything far from these ratios
loses its edges. If a face gets clipped, nudge the crop rather than re-shooting:

```ts
// lib/config.ts — CSS object-position, "horizontal vertical"
focus: "50% 30%",   // pull the crop toward the top of the image
```

The hero already uses this. Story and gallery images crop from the centre.

## A few tips

- **The hero photo gets a torn watercolour edge**, so keep faces well inside
  the frame — the outer ~8% on each side gets eaten by the tear.
- **Resolution matters at the top.** The hero displays around 420px wide, so on
  a high-DPI phone it wants a source of at least ~850px across. The current
  `hero.jpg` is 540×360, which is a little soft once cropped square.
- **Size big files down first.** Anything over ~2000px wide is wasted. Next.js
  resizes and converts to WebP automatically, but a 12MB camera file still
  costs you on every build.
- **If a file is missing**, the site shows a labelled placeholder with the
  filename on it rather than a broken-image icon — so a typo is obvious rather
  than ugly.

## Adding gallery photos

The gallery is a scattered set of prints, each with a handwritten line in the
white band beneath it. Edit the `gallery` array in `lib/config.ts`:

```ts
{
  src: "/images/gallery-1.jpg",
  alt: "Description for screen readers",
  caption: "where it began",     // the handwritten line — three or four words
  shape: "square",               // "square" | "tall" | "wide"
},
```

`shape` sets the crop. The layout places four prints into named slots by hand,
so if you add a fifth you'll need a slot for it in `Gallery.module.css` — look
for `.slotA` through `.slotD`.

The two handwritten notes tucked among the prints, and the little date stamp
printed down the side, live just below in `galleryNotes`. `\n` gives you a line
break inside a note.

## Placeholder washes

Before real photos went in, this folder held generated abstract watercolours.
To bring them back for empty slots:

```bash
npm run placeholders
```

**This writes `hero.png`, `story-1.png`, `gallery-1.png` … and will overwrite
any real photo sharing those names.** The current photos are `.jpg`/`.webp`, so
they're safe — but you'd then need to point `lib/config.ts` back at the `.png`
files for the washes to show.
