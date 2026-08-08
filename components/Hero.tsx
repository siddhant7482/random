"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { wedding } from "@/lib/config";
import { useIntroDelay } from "@/lib/useIntroDelay";
import BrushPhoto from "./BrushPhoto";
import { CornerFloral } from "./Florals";
import s from "./Hero.module.css";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();
  const intro = useIntroDelay();
  const ref = useRef<HTMLElement>(null);

  /* Gentle parallax: the photo drifts up a little slower than the page,
     and the whole hero fades as it leaves. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const ready = intro !== null;
  const base = intro ?? 0;

  // one shared entrance, staggered by index
  const rise = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 22 } as const),
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1, delay: base + i * 0.13, ease: EASE },
  });

  return (
    <section className={s.hero} ref={ref} id="hero">
      <div className={s.frame} aria-hidden="true" />

      <motion.div
        className={`${s.corner} ${s.cornerTl}`}
        initial={reduce ? false : { opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, delay: base }}
      >
        <div className={ready ? "is-drawn" : undefined}>
          <CornerFloral />
        </div>
      </motion.div>

      <motion.div
        className={`${s.corner} ${s.cornerBr}`}
        initial={reduce ? false : { opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, delay: base + 0.2 }}
      >
        <div className={ready ? "is-drawn" : undefined}>
          <CornerFloral flip />
        </div>
      </motion.div>

      <motion.div className={s.inner} style={reduce ? undefined : { opacity: fade }}>
        <motion.p className={`eyebrow ${s.eyebrow}`} {...rise(0)}>
          {wedding.hero.eyebrow}
        </motion.p>

        <motion.div
          className={s.photo}
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 1.4, delay: base + 0.15, ease: EASE }}
          style={reduce ? undefined : { y: photoY }}
        >
          <BrushPhoto
            src={wedding.hero.photo}
            alt={wedding.hero.photoAlt}
            variant="hero"
            ratio={1}
            priority
            focus={wedding.hero.focus}
            sizes="(max-width: 700px) 78vw, 460px"
          />
        </motion.div>

        <motion.h1 className={s.names} {...rise(3)}>
          <span className="script">{wedding.bride}</span>
          <span className={s.amp}>&amp;</span>
          <span className="script">{wedding.groom}</span>
        </motion.h1>

        <motion.p className={`caps ${s.meta}`} {...rise(4)}>
          {wedding.dateLong}
        </motion.p>
        <motion.p className={`caps ${s.meta}`} {...rise(5)}>
          {wedding.place}
        </motion.p>

        <motion.p className={`scriptAccent ${s.accent}`} {...rise(6)}>
          {wedding.hero.accent}
        </motion.p>

        <motion.div {...rise(7)}>
          <a className="btn" href="#rsvp">
            <span>RSVP</span>
          </a>
        </motion.div>
      </motion.div>

      {/* two layers: the outer one is driven by scroll, the inner by the
          intro timeline — one opacity each, so neither overwrites the other */}
      <motion.div
        className={s.scrollHint}
        aria-hidden="true"
        style={reduce ? undefined : { opacity: fade }}
      >
        <motion.span
          className={s.scrollLine}
          initial={reduce ? false : { opacity: 0 }}
          animate={ready ? { opacity: 1 } : undefined}
          transition={{ duration: 1, delay: base + 1.2 }}
        />
      </motion.div>
    </section>
  );
}
