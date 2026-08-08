"use client";

import { useState } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** seconds to wait after entering view */
  delay?: number;
  /** how far it travels up, in px */
  y?: number;
  /** fraction of the element that must be visible before it fires */
  amount?: number;
  as?: "div" | "section" | "article" | "li" | "figure" | "header" | "p";
} & Omit<HTMLMotionProps<"div">, "children" | "className">;

/**
 * Fade-and-rise on scroll, once.
 *
 * Two things worth knowing:
 *  - It also stamps `is-drawn` on itself when it enters view, which is what
 *    triggers the SVG line-drawing florals nested inside it (see globals.css).
 *  - With `prefers-reduced-motion` it renders fully visible immediately —
 *    no transform, no delay, nothing to wait for.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 26,
  amount = 0.2,
  as = "div",
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const [seen, setSeen] = useState(false);
  const Tag = motion[as] as typeof motion.div;

  const cls = [className, seen ? "is-drawn" : ""].filter(Boolean).join(" ");

  if (reduce) {
    return (
      <Tag className={[className, "is-drawn"].filter(Boolean).join(" ")} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={cls}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setSeen(true)}
      viewport={{ once: true, amount, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 0.61, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
