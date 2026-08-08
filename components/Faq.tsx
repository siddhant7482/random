"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { faq } from "@/lib/config";
import Reveal from "./Reveal";
import s from "./Faq.module.css";

export default function Faq() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section" id="faq">
      <div className="shell--narrow">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">FAQ</p>
          <h2 className="scriptTitle">Good questions</h2>
        </Reveal>

        <div className={s.list}>
          {faq.map((item, i) => {
            const isOpen = open === i;

            return (
              <Reveal key={item.q} className={s.item} delay={i * 0.04} amount={0.4}>
                <h3 className={s.qWrap}>
                  <button
                    type="button"
                    className={s.q}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className={`${s.plus} ${isOpen ? s.plusOpen : ""}`} aria-hidden="true">
                      <span />
                      <span />
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-button-${i}`}
                      className={s.panel}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <p className={s.a}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
