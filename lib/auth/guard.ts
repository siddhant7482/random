import "server-only";

import { NextResponse } from "next/server";
import { getAuth, type Authed } from "./session";
import { sameOrigin } from "./policy";

/* Shared entry points so no route can forget a check. */

/** For Route Handlers. Enforces both a valid session and a same-origin request. */
export async function requireAdminApi(
  opts: { checkOrigin?: boolean } = {},
): Promise<{ auth: Authed } | { response: NextResponse }> {
  const { checkOrigin = true } = opts;

  if (checkOrigin && !(await sameOrigin())) {
    return {
      response: NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 }),
    };
  }

  const auth = await getAuth();
  if (!auth) {
    return {
      response: NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }),
    };
  }

  return { auth };
}

export const isResponse = (
  v: { auth: Authed } | { response: NextResponse },
): v is { response: NextResponse } => "response" in v;
