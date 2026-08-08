import { dayIntro, schedule, wedding } from "@/lib/config";
import Reveal from "./Reveal";
import s from "./TheDay.module.css";

/** Turns "Saturday, January 23, 2026" into "23rd January" for the heading. */
function headingDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return {
    day,
    suffix,
    month: d.toLocaleDateString("en-GB", { month: "long" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "long" }),
  };
}

export default function TheDay() {
  const { day, suffix, month, weekday } = headingDate(wedding.dateISO);

  return (
    <section className="section section--tint" id="day">
      <div className="shell--narrow">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">The Day</p>
          <h2 className="scriptTitle">
            {weekday}, {day}
            <sup>{suffix}</sup> {month}
          </h2>
          <p className="sectionSub">{dayIntro}</p>
        </Reveal>

        <ol className={s.timeline}>
          {schedule.map((item, i) => (
            <Reveal
              key={item.title}
              as="li"
              className={s.item}
              delay={i * 0.05}
              amount={0.4}
            >
              <span className={`caps ${s.time}`}>{item.time}</span>

              <span className={s.marker} aria-hidden="true">
                <span className={s.dot} />
              </span>

              <div className={s.body}>
                <h3 className={s.title}>{item.title}</h3>
                <p className={s.note}>{item.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
