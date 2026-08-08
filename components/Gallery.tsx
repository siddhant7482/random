"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { gallery, galleryNotes } from "@/lib/config";
import Reveal from "./Reveal";
import s from "./Gallery.module.css";

/** Tilt per print, in degrees. Fixed rather than random so the layout is
    identical on the server and the client, and never reshuffles on a re-render. */
const TILT = [-2.6, 1.8, -1.4, 2.4, -2, 1.2];

export default function Gallery() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState<number | null>(null);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setIndex(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i === null ? i : (i + dir + gallery.length) % gallery.length));
  }, []);

  useEffect(() => {
    if (index === null) return;

    document.body.classList.add("is-locked");
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
    };
  }, [index, close, step]);

  const markBroken = (i: number) =>
    setBroken((prev) => new Set(prev).add(i));

  const active = index === null ? null : gallery[index];

  /* Prints and marginalia are interleaved so the notes sit among the photos
     rather than after them. Order matters — it drives the grid flow. */
  return (
    <section className="section" id="gallery">
      <div className="shell">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">Gallery</p>
          <h2 className="scriptTitle">A few of our favourites</h2>
        </Reveal>

        {/* Two rows only. Each child is placed explicitly rather than left to
            auto-flow, which is what keeps the composition tight instead of
            leaving a column of dead space beside the smaller prints. */}
        <div className={s.collage}>
          <Print place={s.slotA} i={0} tilt={TILT[0]} broken={broken} markBroken={markBroken} open={setIndex} openerRef={openerRef} />

          <Reveal className={`${s.note} ${s.slotNoteA}`} delay={0.1} amount={0.3}>
            <p className={s.noteText}>{galleryNotes.first}</p>
          </Reveal>

          <Print place={s.slotB} i={1} tilt={TILT[1]} broken={broken} markBroken={markBroken} open={setIndex} openerRef={openerRef} />
          <Print place={s.slotC} i={2} tilt={TILT[2]} broken={broken} markBroken={markBroken} open={setIndex} openerRef={openerRef} />
          <Print place={s.slotD} i={3} tilt={TILT[3]} broken={broken} markBroken={markBroken} open={setIndex} openerRef={openerRef} />

          <Reveal className={s.slotSide} delay={0.1} amount={0.3}>
            <p className={`${s.noteText} ${s.noteB}`}>{galleryNotes.second}</p>
            <span className={s.stamp}>{galleryNotes.stamp}</span>
          </Reveal>
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className={s.lightbox}
            role="dialog"
            aria-modal="true"
            aria-label={active.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
          >
            <button ref={closeRef} type="button" className={s.close} onClick={close} aria-label="Close">
              &times;
            </button>

            <button
              type="button"
              className={`${s.arrow} ${s.prev}`}
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Previous photo"
            >
              &#8249;
            </button>

            <motion.div
              key={active.src}
              className={s.stage}
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Image src={active.src} alt={active.alt} fill sizes="92vw" className={s.lightboxImg} />
            </motion.div>

            <button
              type="button"
              className={`${s.arrow} ${s.next}`}
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Next photo"
            >
              &#8250;
            </button>

            <p className={`caps ${s.counter}`}>
              {(index ?? 0) + 1} / {gallery.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Print({
  i,
  tilt,
  place,
  broken,
  markBroken,
  open,
  openerRef,
}: {
  i: number;
  tilt: number;
  place: string;
  broken: Set<number>;
  markBroken: (i: number) => void;
  open: (i: number) => void;
  openerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const item = gallery[i];
  const isBroken = broken.has(i);

  return (
    <Reveal
      as="figure"
      className={`${s.print} ${s[item.shape]} ${place}`}
      delay={(i % 3) * 0.07}
      amount={0.15}
      // the resting tilt; hover straightens it
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <button
        type="button"
        className={s.printBtn}
        onClick={(e) => {
          openerRef.current = e.currentTarget;
          open(i);
        }}
        aria-label={`Open photo: ${item.alt}`}
        disabled={isBroken}
      >
        <span className={s.window}>
          {isBroken ? (
            <span className={s.missing}>{item.src.replace(/^\//, "")}</span>
          ) : (
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 32vw, 320px"
              className={s.img}
              onError={() => markBroken(i)}
            />
          )}
        </span>

        <span className={s.caption}>{item.caption}</span>
      </button>
    </Reveal>
  );
}
