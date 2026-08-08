import "server-only";

import { wedding } from "./config";
import type { Rsvp } from "./rsvp-store";

/* ============================================================
   Sending mail, without tying the site to one provider.

   Both supported services are plain HTTPS APIs, so this needs no npm
   package at all — just fetch.

     RESEND_API_KEY  -> Resend. Best deliverability, but it will only send to
                        arbitrary addresses once you have verified a domain
                        you own.
     BREVO_API_KEY   -> Brevo. Free tier is 300/day and it lets you verify a
                        single ordinary address (a Gmail is fine), so guest
                        confirmations work without buying a domain.

   With neither set, mail is written to the server log instead. Nothing
   breaks; you just don't get emails.
   ============================================================ */

type Message = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type MailResult = { sent: boolean; provider: string; error?: string };

const fromEmail = () => process.env.MAIL_FROM_EMAIL || "no-reply@example.com";
const fromName = () => process.env.MAIL_FROM_NAME || `${wedding.bride} & ${wedding.groom}`;

export function mailMode(): "resend" | "brevo" | "log" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.BREVO_API_KEY) return "brevo";
  return "log";
}

async function send(msg: Message): Promise<MailResult> {
  const mode = mailMode();

  try {
    if (mode === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName()} <${fromEmail()}>`,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
      });
      if (!res.ok) return { sent: false, provider: mode, error: await res.text() };
      return { sent: true, provider: mode };
    }

    if (mode === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY!,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: fromEmail(), name: fromName() },
          to: [{ email: msg.to }],
          subject: msg.subject,
          htmlContent: msg.html,
          ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
        }),
      });
      if (!res.ok) return { sent: false, provider: mode, error: await res.text() };
      return { sent: true, provider: mode };
    }

    console.info(`[mail:log] would send to ${msg.to} — ${msg.subject}`);
    return { sent: false, provider: "log" };
  } catch (err) {
    return { sent: false, provider: mode, error: String(err) };
  }
}

/* ---------------- templates ---------------- */

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#fbf9f6;padding:32px 16px;
    font-family:Georgia,'Times New Roman',serif;color:#17263c;line-height:1.7">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid rgba(23,38,60,.12);padding:36px 32px">
      ${inner}
      <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid rgba(23,38,60,.1);
         font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#6b7a90">
        ${esc(wedding.bride)} &amp; ${esc(wedding.groom)} &middot; ${esc(wedding.dateShort)} &middot; ${esc(wedding.place)}
      </p>
    </div></body></html>`;
}

/** Sent to the guest, so they know the reply landed. */
export function guestConfirmation(r: Rsvp) {
  const coming = r.attending === "yes";

  const body = coming
    ? `<p style="margin:0 0 16px">Thank you — we have you down${r.guests > 1 ? ` for <strong>${r.guests}</strong>` : ""}, and we are so glad you can come.</p>
       <p style="margin:0 0 16px">We'll send the finer details closer to the day. If anything changes, just reply to this email.</p>`
    : `<p style="margin:0 0 16px">Thank you for letting us know. We're sorry you can't make it, and we'll be thinking of you on the day.</p>
       <p style="margin:0 0 16px">If your plans change, just reply to this email — there's always room.</p>`;

  return {
    subject: `Thank you for replying — ${wedding.bride} & ${wedding.groom}`,
    html: shell(
      `<p style="margin:0 0 20px;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b99458">
         ${coming ? "Joyfully accepted" : "Reply received"}
       </p>
       <p style="margin:0 0 16px">Dear ${esc(r.name)},</p>
       ${body}
       <p style="margin:0">With love,<br/>${esc(wedding.bride)} &amp; ${esc(wedding.groom)}</p>`,
    ),
  };
}

/** Sent to the couple on every reply. */
export function coupleAlert(r: Rsvp) {
  const line = (label: string, value: string | number | null) =>
    value === null || value === "" || value === undefined
      ? ""
      : `<tr><td style="padding:6px 16px 6px 0;color:#6b7a90;font-size:14px;white-space:nowrap">${label}</td>
             <td style="padding:6px 0;font-size:15px">${esc(String(value))}</td></tr>`;

  return {
    subject: `${r.attending === "yes" ? "✓" : "✕"} RSVP from ${r.name}`,
    html: shell(
      `<p style="margin:0 0 20px;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b99458">
         New RSVP
       </p>
       <table style="border-collapse:collapse;width:100%">
         ${line("Name", r.name)}
         ${line("Attending", r.attending === "yes" ? "Yes" : "No")}
         ${line("Party size", r.attending === "yes" ? r.guests : null)}
         ${line("Email", r.email)}
         ${line("Phone", r.phone)}
         ${line("Dietary", r.dietary)}
         ${line("Song", r.song)}
         ${line("Note", r.note)}
       </table>`,
    ),
  };
}

/**
 * Fire both emails. Deliberately never throws — a mail outage must not cost
 * you an RSVP, so the caller stores the reply first and treats this as
 * best-effort.
 */
export async function notifyOnRsvp(r: Rsvp): Promise<{ guest: MailResult; couple: MailResult }> {
  const coupleTo = process.env.COUPLE_NOTIFY_EMAIL || wedding.email;

  const [guest, couple] = await Promise.all([
    send({ ...guestConfirmation(r), to: r.email, replyTo: coupleTo }),
    send({ ...coupleAlert(r), to: coupleTo, replyTo: r.email }),
  ]);

  if (!guest.sent && guest.error) console.error("[mail] guest confirmation failed:", guest.error);
  if (!couple.sent && couple.error) console.error("[mail] couple alert failed:", couple.error);

  return { guest, couple };
}
