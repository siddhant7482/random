import { wedding } from "@/lib/config";
import { GarlandFloral } from "./Florals";
import Reveal from "./Reveal";
import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <Reveal className={s.garland} amount={0.4}>
        <GarlandFloral />
      </Reveal>

      <Reveal className={s.inner} delay={0.15}>
        <p className={s.names}>
          <span className="script">{wedding.bride}</span>
          <span className={s.amp}>&amp;</span>
          <span className="script">{wedding.groom}</span>
        </p>

        <p className={`caps ${s.meta}`}>
          {wedding.dateShort} &nbsp;·&nbsp; {wedding.place}
        </p>

        <p className={`scriptAccent ${s.accent}`}>with love, and endless thanks</p>

        <p className={s.contact}>
          <a href={`mailto:${wedding.email}`}>{wedding.email}</a>
          <span aria-hidden="true">·</span>
          <span>{wedding.hashtag}</span>
        </p>
      </Reveal>
    </footer>
  );
}
