"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import s from "./Petals.module.css";

type Kind = "petal" | "mote";

type Particle = {
  kind: Kind;
  x: number;
  y: number;
  size: number;
  /** vertical speed, px per second — negative drifts upward */
  fall: number;
  /** horizontal sway amplitude in px */
  sway: number;
  swaySpeed: number;
  phase: number;
  spin: number;
  angle: number;
  /** fakes a 3-D tumble by squashing the petal horizontally */
  flip: number;
  flipSpeed: number;
  color: string;
  alpha: number;
  /** motes only: how fast they breathe */
  pulseSpeed: number;
};

/* Taken from the card's own flowers, so the drift reads as petals off the
   wreath rather than confetti from a different palette. */
const PETAL_COLORS = [
  "226, 163, 135", // rose, from the wreath's blossoms
  "201, 146, 79", // gold, from the monogram
  "150, 152, 106", // olive, from the leaves
  "247, 214, 182", // pale parchment
];

const SPRITE_SIZE = 64;

/** How close the pointer has to be, in CSS pixels, before petals move. */
const PUSH_RADIUS = 150;
/** Peak push speed, px per second, at the very centre of that radius. */
const PUSH_STRENGTH = 420;

/**
 * Petals and warm light motes drifting down the whole page.
 *
 * Kept honest about cost:
 *  - count scales with viewport area and is capped hard on small screens
 *  - the mote glow is one pre-rendered sprite, blitted with drawImage; building
 *    a radial gradient per mote per frame is the obvious way to write this and
 *    is many times more expensive
 *  - DPR capped at 2 (a 3x phone canvas is 2.25x the fill for no visible gain)
 *  - rAF is cancelled when the tab is hidden, so a backgrounded tab costs nothing
 *  - delta-timed, so it drifts at the same speed on 60Hz and 120Hz displays
 *  - removed entirely under prefers-reduced-motion
 */
export default function Petals() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const particles: Particle[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    /* Where the cursor or finger is, in CSS pixels. Read every frame rather
       than reacted to per event: pointermove fires far more often than we
       draw, and doing the maths on each one is wasted work. */
    const pointer = { x: -9999, y: -9999, live: false };

    /* One soft warm dot, drawn once and reused for every mote. */
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    {
      const sctx = sprite.getContext("2d");
      if (sctx) {
        const c = SPRITE_SIZE / 2;
        const g = sctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 246, 224, 0.95)");
        g.addColorStop(0.28, "rgba(246, 214, 165, 0.45)");
        g.addColorStop(0.6, "rgba(214, 168, 106, 0.14)");
        g.addColorStop(1, "rgba(214, 168, 106, 0)");
        sctx.fillStyle = g;
        sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      }
    }

    const makeParticle = (kind: Kind, seeded: boolean): Particle => {
      const isMote = kind === "mote";

      return {
        kind,
        x: rand(0, w),
        // seeded particles start scattered; later ones enter from off-screen
        y: seeded ? rand(-h, h) : isMote ? rand(h, h * 1.3) : rand(-h * 0.4, -20),
        size: isMote ? rand(3, 9) : rand(6, 15),
        // motes rise gently, petals fall
        fall: isMote ? rand(-26, -8) : rand(14, 42),
        sway: isMote ? rand(8, 30) : rand(14, 52),
        swaySpeed: isMote ? rand(0.1, 0.32) : rand(0.15, 0.5),
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.35, 0.35),
        angle: rand(0, Math.PI * 2),
        flip: rand(0, Math.PI * 2),
        flipSpeed: rand(0.25, 0.75),
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        alpha: isMote ? rand(0.3, 0.8) : rand(0.22, 0.6),
        pulseSpeed: rand(0.5, 1.4),
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Denser than it was: with only a couple of dozen on screen you could
         sweep the cursor about and hit nothing, and the interaction went
         unnoticed. Still clamped hard, and still cheap — these are two
         bezier curves and a blitted sprite each. */
      // roughly one particle per 21,000 px² — then clamped for phones and 4K alike
      const total = Math.round(Math.min(Math.max((w * h) / 21000, 16), w < 700 ? 34 : 72));
      const wantMotes = Math.round(total * 0.38);
      const wantPetals = total - wantMotes;

      const count = (k: Kind) => particles.filter((p) => p.kind === k).length;

      // trim the excess kind-by-kind, then top each back up
      for (const [kind, want] of [
        ["petal", wantPetals],
        ["mote", wantMotes],
      ] as const) {
        while (count(kind) > want) {
          particles.splice(
            particles.findIndex((p) => p.kind === kind),
            1,
          );
        }
        while (count(kind) < want) particles.push(makeParticle(kind, true));
      }
    };

    const drawPetal = (p: Particle) => {
      const squash = Math.abs(Math.cos(p.flip)) * 0.75 + 0.25;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(squash, 1);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${p.color})`;

      // a single teardrop petal
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.5);
      ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.2, p.size * 0.45, p.size * 0.45, 0, p.size * 0.6);
      ctx.bezierCurveTo(-p.size * 0.45, p.size * 0.45, -p.size * 0.6, -p.size * 0.2, 0, -p.size * 0.5);
      ctx.fill();

      ctx.restore();
    };

    const drawMote = (p: Particle) => {
      // breathe between roughly a third and full brightness
      const pulse = 0.65 + Math.sin(elapsed * p.pulseSpeed + p.phase) * 0.35;
      const r = p.size * 2.6;

      ctx.globalAlpha = p.alpha * pulse;
      ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp: a tab switch shouldn't teleport them
      last = now;
      elapsed += dt;

      ctx.clearRect(0, 0, w, h);
      /* Deliberately source-over, not "lighter". Additive blending is the
         instinct for glowing motes, but against an ivory page it clips
         straight to white and they read as dirty smudges. The sprite's own
         alpha falloff does the work instead. */
      ctx.globalCompositeOperation = "source-over";

      for (const p of particles) {
        /* Petals scatter out of the way. The push falls off to nothing at the
           edge of the radius, so there is no hard boundary where they
           suddenly jump, and it is applied as a velocity rather than a
           position so they drift on afterwards instead of snapping back. */
        if (pointer.live) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < PUSH_RADIUS * PUSH_RADIUS && dist2 > 1) {
            const dist = Math.sqrt(dist2);
            const falloff = 1 - dist / PUSH_RADIUS;
            const push = falloff * falloff * PUSH_STRENGTH * dt;
            p.x += (dx / dist) * push;
            p.y += (dy / dist) * push;
            // and a little tumble, so they turn as they are brushed aside
            p.angle += falloff * 0.9 * dt * (dx > 0 ? 1 : -1);
          }
        }

        p.phase += p.swaySpeed * dt;
        p.angle += p.spin * dt;
        p.flip += p.flipSpeed * dt;
        p.y += p.fall * dt;
        p.x += Math.sin(p.phase) * p.sway * dt;

        // recycle once fully clear of the edge it travels toward
        if (p.fall > 0 ? p.y - p.size > h : p.y + p.size * 3 < 0) {
          Object.assign(p, makeParticle(p.kind, false));
        } else if (p.x < -60) {
          p.x = w + 40;
        } else if (p.x > w + 60) {
          p.x = -40;
        }

        if (p.kind === "mote") drawMote(p);
        else drawPetal(p);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.live = true;
    };
    // a finger lifting leaves no cursor behind, so stop pushing from there
    const onPointerGone = () => {
      pointer.live = false;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    resize();
    start();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", onPointerGone, { passive: true });
    window.addEventListener("pointercancel", onPointerGone, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointerGone);
      window.removeEventListener("pointercancel", onPointerGone);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  if (reduce) return null;

  return <canvas ref={ref} className={s.petals} aria-hidden="true" />;
}
