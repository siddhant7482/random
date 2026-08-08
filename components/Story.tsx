import { story } from "@/lib/config";
import BrushPhoto from "./BrushPhoto";
import Reveal from "./Reveal";
import { SprigFloral } from "./Florals";
import s from "./Story.module.css";

export default function Story() {
  return (
    <section className="section" id="story">
      <div className="shell">
        <Reveal className="sectionHead" as="header">
          <p className="eyebrow">Our Story</p>
          <h2 className="scriptTitle">How we got here</h2>
        </Reveal>

        <div className={s.list}>
          {story.map((item, i) => (
            <Reveal
              key={item.title}
              as="article"
              className={`${s.row} ${i % 2 ? s.flip : ""}`}
              amount={0.15}
            >
              <div className={s.photo}>
                <BrushPhoto
                  src={item.photo}
                  alt={item.alt}
                  variant={i % 2 ? "softB" : "soft"}
                  ratio={4 / 5}
                  sizes="(max-width: 820px) 76vw, 380px"
                />
              </div>

              <div className={s.text}>
                <p className={`caps ${s.year}`}>{item.year}</p>
                <h3 className={s.title}>{item.title}</h3>
                <p className={s.body}>{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className={s.sprig}>
          <SprigFloral />
        </Reveal>
      </div>
    </section>
  );
}
