"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import s from "./admin.module.css";

type Begin = { secret: string; formatted: string; uri: string; qr: string };

/**
 * First-run account creation.
 *
 * Two-factor is set up during creation, not offered afterwards — an account
 * that can be created without it is an account that will run without it.
 */
export default function AdminSetup() {
  const router = useRouter();
  const [stage, setStage] = useState<"details" | "enrol" | "codes">("details");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [begin, setBegin] = useState<Begin | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function onDetails(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 12) next.password = "Use at least 12 characters.";
    else if (password !== confirm) next.confirm = "The two passwords don't match.";

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setBusy(true);
    const body = new FormData();
    body.set("step", "begin");
    body.set("email", email);

    const res = await fetch("/api/admin/setup", { method: "POST", body });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setErrors({ form: json.error ?? "Could not start setup." });
      return;
    }

    setBegin(json);
    setStage("enrol");
  }

  async function onEnrol(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    if (!begin) return;

    setBusy(true);
    setErrors({});

    const body = new FormData(e.currentTarget);
    body.set("step", "create");
    body.set("email", email);
    body.set("password", password);
    body.set("confirm", confirm);
    body.set("secret", begin.secret);

    const res = await fetch("/api/admin/setup", { method: "POST", body });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setErrors(json.errors ?? { form: json.error ?? "Could not finish setup." });
      return;
    }

    setRecoveryCodes(json.recoveryCodes ?? []);
    setStage("codes");
  }

  if (stage === "codes") {
    return (
      <main className={s.gate}>
        <div className={`${s.gateCard} ${s.gateWide}`}>
          <p className={s.gateEyebrow}>Save these now</p>
          <h1 className={s.gateTitle}>Recovery codes</h1>
          <p className={s.gateText}>
            Each of these works once, in place of your authenticator app. They are the only way
            back in if you lose your phone. <strong>They will not be shown again.</strong> Print
            them, or put them in a password manager.
          </p>

          <ul className={s.codeGrid}>
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>

          <button
            className={s.button}
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(recoveryCodes.join("\n"));
            }}
          >
            Copy to clipboard
          </button>

          <button
            className={`${s.button} ${s.buttonQuiet}`}
            type="button"
            onClick={() => router.refresh()}
          >
            I&apos;ve saved them — continue
          </button>
        </div>
      </main>
    );
  }

  if (stage === "enrol" && begin) {
    return (
      <main className={s.gate}>
        <form className={`${s.gateCard} ${s.gateWide}`} onSubmit={onEnrol}>
          <p className={s.gateEyebrow}>Step 2 of 2</p>
          <h1 className={s.gateTitle}>Set up two-factor</h1>
          <p className={s.gateText}>
            Scan this with Google Authenticator, 1Password, Bitwarden or similar, then type the
            six-digit code it shows.
          </p>

          {/* Server-rendered SVG, so the secret never leaves your own site. */}
          <div className={s.qr} dangerouslySetInnerHTML={{ __html: begin.qr }} />

          <p className={s.gateText}>
            Can&apos;t scan? Enter this key by hand:
            <br />
            <code className={s.secret}>{begin.formatted}</code>
          </p>

          <label className={s.label} htmlFor="code">
            Six-digit code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            className={`${s.input} ${s.inputCode}`}
          />

          {(errors.code || errors.form || errors.email || errors.password) && (
            <p className={s.error}>
              {errors.code ?? errors.form ?? errors.email ?? errors.password}
            </p>
          )}

          <button className={s.button} type="submit" disabled={busy}>
            {busy ? "Checking…" : "Create account"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={s.gate}>
      <form className={s.gateCard} onSubmit={onDetails}>
        <p className={s.gateEyebrow}>Step 1 of 2</p>
        <h1 className={s.gateTitle}>Create your account</h1>
        <p className={s.gateText}>
          This is the only account that can read the guest list. Nobody else can create one after
          this.
        </p>

        <label className={s.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className={s.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <p className={s.error}>{errors.email}</p>}

        <label className={s.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          className={s.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className={s.hint}>
          At least 12 characters. A few unrelated words beats a short jumble.
        </span>
        {errors.password && <p className={s.error}>{errors.password}</p>}

        <label className={s.label} htmlFor="confirm">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={s.input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {errors.confirm && <p className={s.error}>{errors.confirm}</p>}
        {errors.form && <p className={s.error}>{errors.form}</p>}

        <button className={s.button} type="submit" disabled={busy}>
          {busy ? "Working…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
