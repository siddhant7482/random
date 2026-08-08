"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { wedding } from "@/lib/config";
import Reveal from "./Reveal";
import s from "./Rsvp.module.css";

type Errors = Partial<Record<"name" | "email" | "phone" | "attending", string>>;
type Status = "idle" | "sending" | "done" | "error";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* Loose on purpose — guests are in several countries and will write numbers
   however they write them. We only reject what clearly isn't a number. */
const PHONE = /^[+()\d][\d\s()+.-]{6,}$/;

export default function Rsvp() {
  const reduce = useReducedMotion();
  const [attending, setAttending] = useState<"yes" | "no" | "">("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    /* Validate here rather than leaning on the browser: native bubbles are
       jarring against this typography, and we want the messages inline. */
    const next: Errors = {};
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();

    if (name.length < 2) next.name = "Please tell us your name.";
    if (!EMAIL.test(email)) next.email = "That email doesn't look quite right.";
    if (phone && !PHONE.test(phone)) next.phone = "That doesn't look like a phone number.";
    if (!data.get("attending")) next.attending = "Please let us know either way.";

    setErrors(next);

    if (Object.keys(next).length > 0) {
      form.querySelector<HTMLElement>(`[data-invalid="true"]`)?.focus();
      return;
    }

    setStatus("sending");

    /* Posts to this site's own /api/rsvp, which stores the reply and sends
       both emails. The server validates all of this again — the checks above
       are only there to be helpful, not to be trusted. */
    try {
      const res = await fetch("/api/rsvp", { method: "POST", body: data });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.ok) {
        setStatus("done");
        return;
      }

      // surface per-field problems the server found
      if (body?.errors) {
        setErrors(body.errors as Errors);
        setStatus("idle");
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const showGuestFields = attending === "yes";

  return (
    <section className="section section--tint" id="rsvp">
      <div className="shell--narrow">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">RSVP</p>
          <h2 className="scriptTitle">Will you join us?</h2>
          <p className="sectionSub">
            Kindly reply by <strong>{wedding.rsvpDeadline}</strong>
          </p>
        </Reveal>

        <AnimatePresence mode="wait">
          {status === "done" ? (
            <motion.div
              key="thanks"
              className={s.thanks}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <svg viewBox="0 0 120 80" className={s.tick} aria-hidden="true">
                <motion.path
                  d="M20,44 L46,66 L100,16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.15, ease: "easeInOut" }}
                />
              </svg>

              <p className="scriptTitle">Thank you</p>
              <p className={s.thanksText}>
                {attending === "no"
                  ? "We'll miss you — thank you for letting us know."
                  : "We've got your reply, and a confirmation is on its way to your inbox."}
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              className={s.form}
              onSubmit={onSubmit}
              noValidate
              initial={false}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <Field label="Full name" error={errors.name} htmlFor="name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="As it appears on your invitation"
                  data-invalid={Boolean(errors.name)}
                />
              </Field>

              <Field label="Email" error={errors.email} htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  data-invalid={Boolean(errors.email)}
                />
              </Field>

              <Field label="Phone" error={errors.phone} htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  data-invalid={Boolean(errors.phone)}
                />
                <span className={s.hint}>
                  So we can reach you about shuttles and timings on the day.
                </span>
              </Field>

              {/* Honeypot. Hidden from people and from screen readers; bots
                  fill every field they find, and the server rejects any reply
                  that has this set. */}
              <div className={s.honeypot} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <fieldset className={s.field}>
                <legend className={s.label}>Will you be there?</legend>
                <div className={s.choices}>
                  {(
                    [
                      ["yes", "Joyfully accepts"],
                      ["no", "Regretfully declines"],
                    ] as const
                  ).map(([value, text]) => (
                    <label key={value} className={s.choice}>
                      <input
                        type="radio"
                        name="attending"
                        value={value}
                        checked={attending === value}
                        onChange={() => setAttending(value)}
                        data-invalid={Boolean(errors.attending)}
                      />
                      <span>{text}</span>
                    </label>
                  ))}
                </div>
                {errors.attending && <span className={s.error}>{errors.attending}</span>}
              </fieldset>

              {/* Guest-only questions slide in; they're removed from the DOM
                  when declining so they never end up in the payload. */}
              <AnimatePresence initial={false}>
                {showGuestFields && (
                  <motion.div
                    className={s.conditional}
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    <Field label="Number in your party" htmlFor="guests">
                      <select id="guests" name="guests" defaultValue="1">
                        <option value="1">Just me</option>
                        <option value="2">Two of us</option>
                        <option value="3">Three</option>
                        <option value="4">Four</option>
                      </select>
                    </Field>

                    <Field label="Dietary requirements" htmlFor="dietary">
                      <input
                        id="dietary"
                        name="dietary"
                        type="text"
                        placeholder="Allergies, vegetarian, vegan…"
                      />
                    </Field>

                    <Field label="One song that will get you dancing" htmlFor="song">
                      <input id="song" name="song" type="text" placeholder="Artist — Title" />
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="A note for us (optional)" htmlFor="note">
                <textarea
                  id="note"
                  name="note"
                  rows={4}
                  placeholder="Anything you'd like us to know"
                />
              </Field>

              <button className="btn btn--solid" type="submit" disabled={status === "sending"}>
                <span>{status === "sending" ? "Sending…" : "Send our reply"}</span>
              </button>

              <p className={s.status} role="status" aria-live="polite">
                {status === "error" &&
                  `Something went wrong sending that. Please email us at ${wedding.email}.`}
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && <span className={s.error}>{error}</span>}
    </div>
  );
}
