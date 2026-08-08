"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { wedding } from "@/lib/config";
import { DividerFloral } from "./Florals";
import Reveal from "./Reveal";
import s from "./Countdown.module.css";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

const UNITS: (keyof Parts)[] = ["days", "hours", "minutes", "seconds"];

function partsUntil(target: number): Parts | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

export default function Countdown() {
  const reduce = useReducedMotion();
  const [parts, setParts] = useState<Parts | null>(null);
  const [ready, setReady] = useState(false);

  /* Deliberately not computed during render: the server's clock and the
     guest's clock will never agree to the second, and React would flag the
     mismatch. First paint shows dashes, then the effect takes over. */
  useEffect(() => {
    const target = new Date(wedding.dateISO).getTime();

    const tick = () => {
      setParts(partsUntil(target));
      setReady(true);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const passed = ready && parts === null;

  return (
    <section className={s.wrap} aria-label="Countdown to the wedding">
      <Reveal className={s.divider}>
        <DividerFloral />
      </Reveal>

      {passed ? (
        <Reveal className={s.after}>
          <p className="scriptTitle">Married</p>
          <p className={s.afterText}>
            Thank you for being part of it — the photographs are on their way.
          </p>
        </Reveal>
      ) : (
        <Reveal className={s.grid} amount={0.35}>
          {UNITS.map((unit) => {
            const value = parts?.[unit];
            const label = value === undefined ? "—" : String(value).padStart(2, "0");

            return (
              <div className={s.cell} key={unit}>
                <span className={s.number}>
                  {reduce ? (
                    label
                  ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={label}
                        className={s.numberInner}
                        initial={{ y: "-70%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "70%", opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                      >
                        {label}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </span>
                <span className={`caps ${s.label}`}>{unit}</span>
              </div>
            );
          })}
        </Reveal>
      )}
    </section>
  );
}
