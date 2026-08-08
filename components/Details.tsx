import { details } from "@/lib/config";
import { rich } from "@/lib/rich";
import { DetailIcon } from "./Florals";
import Reveal from "./Reveal";
import s from "./Details.module.css";

export default function Details() {
  return (
    <section className="section" id="details">
      <div className="shell">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">Details</p>
          <h2 className="scriptTitle">Everything you need</h2>
        </Reveal>

        <div className={s.grid}>
          {details.map((card, i) => (
            <Reveal
              key={card.title}
              as="article"
              className={s.card}
              delay={(i % 3) * 0.08}
              amount={0.25}
            >
              <span className={s.icon}>
                <DetailIcon name={card.icon} />
              </span>

              <h3 className={s.title}>{card.title}</h3>

              {card.body.map((para, j) => (
                <p key={j} className={s.para}>
                  {rich(para)}
                </p>
              ))}

              {card.link && (
                <a
                  className={`linkArrow ${s.link}`}
                  href={card.link.href}
                  {...(card.link.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {card.link.label}
                </a>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
