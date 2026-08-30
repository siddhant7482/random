"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { wedding } from "@/lib/config";
import { useIntroDelay } from "@/lib/useIntroDelay";
import { CityScene, Fleuron, HeartRule, TopArc, Wreath } from "./CardArt";
import s from "./Hero.module.css";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();
  const intro = useIntroDelay();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const ready = intro !== null;
  const base = intro ?? 0;

  // one shared entrance, staggered down the card
  const rise = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 18 } as const),
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.9, delay: base + i * 0.11, ease: EASE },
  });

  return (
    <section className={s.hero} ref={ref} id="hero">
      <motion.div className={s.inner} style={reduce ? undefined : { opacity: fade }}>
        <motion.div className={s.arc} {...rise(0)}>
          <TopArc />
        </motion.div>

        <motion.p className={`caps ${s.eyebrow}`} {...rise(1)}>
          {wedding.hero.eyebrow}
        </motion.p>

        {/* The medallion: wreath, monogram and the two cities, stacked. It
            scales as one unit so the ornament never drifts off the art. */}
        <motion.div
          className={s.medallion}
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 1.5, delay: base + 0.2, ease: EASE }}
        >
          <Wreath className={s.wreath} />

          <div className={s.medallionInner}>
            <p className={s.monogram} aria-label={`${wedding.bride[0]} and ${wedding.groom[0]}`}>
              <span>{wedding.bride[0]}</span>
              <span className={s.monogramR}>{wedding.groom[0]}</span>
            </p>

            <CityScene className={s.scene} />
          </div>
        </motion.div>

        <motion.h1 className={s.names} {...rise(4)}>
          <span className="script">{wedding.bride}</span>
          <span className={s.amp}>&amp;</span>
          <span className="script">{wedding.groom}</span>
        </motion.h1>

        <motion.div className={s.rule} {...rise(5)}>
          <Fleuron />
        </motion.div>

        <motion.p className={`caps ${s.meta}`} {...rise(6)}>
          {wedding.dateLong}
        </motion.p>
        <motion.p className={`caps ${s.meta}`} {...rise(7)}>
          {wedding.place}
        </motion.p>

        <motion.p className={s.tagline} {...rise(8)}>
          {wedding.hero.tagline}
        </motion.p>

        <motion.div className={s.cta} {...rise(9)}>
          <a className={s.rsvpBox} href="#rsvp">
            RSVP
          </a>
        </motion.div>

        <motion.div className={s.heart} {...rise(10)}>
          <HeartRule />
        </motion.div>
      </motion.div>
    </section>
  );
}
