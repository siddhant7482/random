"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { navLinks, wedding } from "@/lib/config";
import s from "./Nav.module.css";

export default function Nav() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /* The header does not react to scrolling at all — no sliding away, no
     backing fading in, no scroll listener. Two earlier versions of this tied
     the bar's appearance to scrollY, and both read as the header flickering
     while you scrolled: on phones the collapsing URL bar fires scroll events
     with direction flips of its own, and a translucent bar shimmers as
     content passes under it. It is now a plain opaque strip that just sits
     there. Anything that needs to move is somewhere else on the page. */

  /* Lock the page behind the mobile menu, and close it on Escape. */
  useEffect(() => {
    document.body.classList.toggle("is-locked", open);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
    };
  }, [open]);

  const initials = `${wedding.bride[0]}${wedding.groom[0]}`;

  /* With no section links there is nothing to put in a menu, so the burger
     and the sheet are dropped and the RSVP button shows at every width — a
     hamburger hiding a single item is worse than no hamburger. Restore
     `navLinks` in the config and both come back. */
  const hasLinks = navLinks.length > 0;

  return (
    <>
      <header className={s.nav}>
        {/* The interlocking monogram from the card, rather than three
            separate letters with an ampersand between them. */}
        <a className={s.brand} href="#top" onClick={() => setOpen(false)} aria-label="Back to top">
          <span>{initials[0]}</span>
          <span className={s.brandR}>{initials[1]}</span>
        </a>

        <nav className={`${s.desktop} ${hasLinks ? "" : s.alwaysOn}`} aria-label="Main">
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li>
              <a className={s.cta} href="#rsvp">
                RSVP
              </a>
            </li>
          </ul>
        </nav>

        {hasLinks && (
          <button
            ref={toggleRef}
            type="button"
            className={`${s.burger} ${open ? s.burgerOpen : ""}`}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        )}
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className={s.sheet}
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Main menu">
              <ul>
                {[...navLinks, { label: "RSVP", href: "#rsvp" }].map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: reduce ? 0 : 0.18 + i * 0.06 }}
                  >
                    <a href={l.href} onClick={() => setOpen(false)}>
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>

            <motion.p
              className={s.sheetMeta}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <span className="caps">{wedding.dateShort}</span>
              <span className="scriptAccent">{wedding.place}</span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
