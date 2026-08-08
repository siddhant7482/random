"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rsvp, Stats } from "@/lib/rsvp-store";
import s from "./admin.module.css";

type Filter = "all" | "yes" | "no";

export type SessionInfo = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
};

export type AuditRow = {
  id: string;
  at: string;
  email: string | null;
  action: string;
  detail: string | null;
  ip: string | null;
};

export default function AdminDashboard({
  rows,
  stats,
  storage,
  mail,
  authStore,
  account,
  currentSessionId,
  sessions,
  trail,
  coupleName,
  deadline,
}: {
  rows: Rsvp[];
  stats: Stats;
  storage: "postgres" | "file";
  mail: "resend" | "brevo" | "log";
  authStore: "postgres" | "file";
  account: {
    email: string;
    lastLoginAt: string | null;
    recoveryRemaining: number;
    totpEnabled: boolean;
  };
  currentSessionId: string;
  sessions: SessionInfo[];
  trail: AuditRow[];
  coupleName: string;
  deadline: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.attending !== filter) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.dietary, r.song, r.note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }

  async function revokeOthers() {
    setRevoking(true);
    await fetch("/api/admin/sessions", { method: "DELETE" });
    setRevoking(false);
    router.refresh();
  }

  const otherSessions = sessions.filter((x) => x.id !== currentSessionId);

  return (
    <main className={s.wrap}>
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>{coupleName}</p>
          <h1 className={s.title}>RSVPs</h1>
          <p className={s.sub}>Replies were asked for by {deadline}</p>
        </div>

        <div className={s.headActions}>
          <a className={s.ghostButton} href="/api/admin/export">
            Download CSV
          </a>
          <button
            className={s.ghostButton}
            type="button"
            onClick={() => setShowSecurity((v) => !v)}
            aria-expanded={showSecurity}
          >
            Security{otherSessions.length > 0 ? ` (${otherSessions.length})` : ""}
          </button>
          <button className={s.ghostButton} type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {showSecurity && (
        <section className={s.security} aria-label="Account security">
          <div className={s.securityGrid}>
            <div>
              <h2 className={s.securityTitle}>Account</h2>
              <p className={s.securityLine}>
                <span>Signed in as</span> {account.email}
              </p>
              <p className={s.securityLine}>
                <span>Two-factor</span> {account.totpEnabled ? "On" : "Off"}
              </p>
              <p className={s.securityLine}>
                <span>Recovery codes left</span> {account.recoveryRemaining}
              </p>
              {account.lastLoginAt && (
                <p className={s.securityLine}>
                  <span>Previous sign-in</span> {formatDate(account.lastLoginAt)}
                </p>
              )}
              {account.recoveryRemaining <= 2 && (
                <p className={s.securityWarn}>
                  You&apos;re nearly out of recovery codes. If you lose your phone with none left,
                  you will be locked out permanently.
                </p>
              )}
            </div>

            <div>
              <h2 className={s.securityTitle}>
                Devices signed in ({sessions.length})
              </h2>
              <ul className={s.sessionList}>
                {sessions.map((x) => (
                  <li key={x.id} className={s.sessionItem}>
                    <span className={s.sessionMeta}>
                      {x.id === currentSessionId && <strong>This device · </strong>}
                      {shortAgent(x.userAgent)}
                      {x.ip ? ` · ${x.ip}` : ""}
                    </span>
                    <span className={s.sessionTime}>last seen {formatDate(x.lastSeenAt)}</span>
                  </li>
                ))}
              </ul>

              <button
                className={s.ghostButton}
                type="button"
                onClick={revokeOthers}
                disabled={revoking || otherSessions.length === 0}
              >
                {revoking
                  ? "Signing out…"
                  : otherSessions.length === 0
                    ? "No other devices"
                    : `Sign out ${otherSessions.length} other device(s)`}
              </button>
            </div>
          </div>

          {trail.length > 0 && (
            <>
              <h2 className={s.securityTitle}>Recent activity</h2>
              <ul className={s.trail}>
                {trail.map((t) => (
                  <li key={t.id}>
                    <span className={s.trailWhen}>{formatDate(t.at)}</span>
                    <span className={s.trailWhat}>{t.action}</span>
                    <span className={s.trailWho}>
                      {[t.email, t.detail, t.ip].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {authStore === "file" && (
        <p className={`${s.banner} ${s.bannerWarn}`}>
          <strong>Accounts are in a local file.</strong> Your login and sessions live in{" "}
          <code>.data/auth.json</code> and will not survive a deploy. Set <code>DATABASE_URL</code>{" "}
          before this goes live.
        </p>
      )}

      {/* The file store is fine locally and silently lossy in production, so
          say so plainly rather than letting replies vanish unnoticed. */}
      {storage === "file" && (
        <p className={`${s.banner} ${s.bannerWarn}`}>
          <strong>Local file storage.</strong> Replies are being written to{" "}
          <code>.data/rsvps.json</code>. That is fine for testing, but it will not survive a deploy
          — set <code>DATABASE_URL</code> before sharing the site with guests.
        </p>
      )}

      {mail === "log" && (
        <p className={s.banner}>
          <strong>No email provider configured.</strong> Replies are still saved, but neither the
          guest confirmation nor your alert is being sent. Set <code>BREVO_API_KEY</code> or{" "}
          <code>RESEND_API_KEY</code> to turn them on.
        </p>
      )}

      <section className={s.stats} aria-label="Summary">
        <Stat label="Replies" value={stats.replies} />
        <Stat label="Accepted" value={stats.accepted} />
        <Stat label="Declined" value={stats.declined} />
        <Stat label="Guests coming" value={stats.attendingHeads} accent />
      </section>

      <div className={s.controls}>
        <div className={s.filters} role="group" aria-label="Filter replies">
          {(
            [
              ["all", `All (${rows.length})`],
              ["yes", `Coming (${stats.accepted})`],
              ["no", `Can't come (${stats.declined})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${s.filter} ${filter === value ? s.filterOn : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          className={s.search}
          type="search"
          placeholder="Search name, email, note…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search replies"
        />
      </div>

      {visible.length === 0 ? (
        <p className={s.empty}>
          {rows.length === 0 ? "No replies yet." : "Nothing matches that search."}
        </p>
      ) : (
        <>
          {/* table on wide screens */}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attending</th>
                  <th>Party</th>
                  <th>Contact</th>
                  <th>Dietary</th>
                  <th>Song</th>
                  <th>Note</th>
                  <th>Replied</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className={s.cellName}>{r.name}</td>
                    <td>
                      <span className={r.attending === "yes" ? s.pillYes : s.pillNo}>
                        {r.attending === "yes" ? "Coming" : "Can't"}
                      </span>
                    </td>
                    <td>{r.attending === "yes" ? r.guests : "—"}</td>
                    <td className={s.cellContact}>
                      <a href={`mailto:${r.email}`}>{r.email}</a>
                      {r.phone && (
                        <a className={s.phone} href={`tel:${r.phone.replace(/\s+/g, "")}`}>
                          {r.phone}
                        </a>
                      )}
                    </td>
                    <td>{r.dietary ?? "—"}</td>
                    <td>{r.song ?? "—"}</td>
                    <td className={s.cellNote}>{r.note ?? "—"}</td>
                    <td className={s.cellDate}>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* cards on narrow screens — a 8-column table is unusable on a phone */}
          <ul className={s.cards}>
            {visible.map((r) => (
              <li key={r.id} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.cardName}>{r.name}</span>
                  <span className={r.attending === "yes" ? s.pillYes : s.pillNo}>
                    {r.attending === "yes" ? `Coming · ${r.guests}` : "Can't come"}
                  </span>
                </div>

                <a className={s.cardLink} href={`mailto:${r.email}`}>
                  {r.email}
                </a>
                {r.phone && (
                  <a className={s.cardLink} href={`tel:${r.phone.replace(/\s+/g, "")}`}>
                    {r.phone}
                  </a>
                )}

                {r.dietary && <Field label="Dietary" value={r.dietary} />}
                {r.song && <Field label="Song" value={r.song} />}
                {r.note && <Field label="Note" value={r.note} />}

                <p className={s.cardDate}>{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`${s.stat} ${accent ? s.statAccent : ""}`}>
      <span className={s.statValue}>{value}</span>
      <span className={s.statLabel}>{label}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className={s.cardField}>
      <span>{label}</span>
      {value}
    </p>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Just enough of the user agent to recognise your own devices. */
function shortAgent(ua: string | null) {
  if (!ua) return "Unknown device";

  const os =
    /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown";

  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : "browser";

  return `${browser} on ${os}`;
}
