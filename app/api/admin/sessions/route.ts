import { NextResponse } from "next/server";
import { isResponse, requireAdminApi } from "@/lib/auth/guard";
import { audit, deleteSessionsForUser } from "@/lib/auth/store";
import { clientMeta } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign out everywhere else.
 *
 * The one control that actually helps if a laptop goes missing or a cookie is
 * suspected stolen — it invalidates every other session server-side, which a
 * cookie-only scheme can't do.
 */
export async function DELETE() {
  const gate = await requireAdminApi();
  if (isResponse(gate)) return gate.response;

  const { user, session } = gate.auth;
  const removed = await deleteSessionsForUser(user.id, session.id);

  const { ip } = await clientMeta();
  await audit({
    userId: user.id,
    email: user.email,
    action: "sessions.revoked",
    detail: `${removed} other session(s)`,
    ip,
  });

  return NextResponse.json({ ok: true, removed });
}
