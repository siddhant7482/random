"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import s from "./admin.module.css";

/**
 * Two steps: credentials, then the authenticator code.
 *
 * The first step issues nothing — no cookie, no session — so a correct
 * password on its own gets an attacker no further than this screen.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [stage, setStage] = useState<"password" | "totp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const body = new FormData(e.currentTarget);
    body.set("stage", stage);
    body.set("email", email);
    body.set("password", password);

    const res = await fetch("/api/admin/session", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "That didn't work.");
      // a lockout invalidates the whole attempt, not just the code
      if (res.status === 429) setStage("password");
      return;
    }

    if (json.next === "totp") {
      setStage("totp");
      return;
    }

    router.refresh();
  }

  return (
    <main className={s.gate}>
      <form className={s.gateCard} onSubmit={submit}>
        <p className={s.gateEyebrow}>Private</p>
        <h1 className={s.gateTitle}>{stage === "password" ? "Sign in" : "Two-factor"}</h1>

        {stage === "password" ? (
          <>
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

            <label className={s.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : (
          <>
            <p className={s.gateText}>
              Enter the six-digit code from your authenticator app, or one of your recovery codes.
            </p>

            <label className={s.label} htmlFor="code">
              Code
            </label>
            <input
              id="code"
              name="code"
              inputMode="text"
              autoComplete="one-time-code"
              required
              autoFocus
              className={`${s.input} ${s.inputCode}`}
            />

            <button
              type="button"
              className={s.linkButton}
              onClick={() => {
                setStage("password");
                setError("");
              }}
            >
              Start again
            </button>
          </>
        )}

        {error && <p className={s.error}>{error}</p>}

        <button className={s.button} type="submit" disabled={busy}>
          {busy ? "Checking…" : stage === "password" ? "Continue" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
