import { NextResponse, type NextRequest } from "next/server";

/* ============================================================
   Security headers for every response.

   In Next 16 this file is called `proxy.ts` — it is what used to be
   `middleware.ts`.

   On the CSP: the public pages are statically generated, and a nonce-based
   policy requires dynamic rendering, so those get a policy that still allows
   inline script (which Next needs to hydrate). The admin area is dynamic
   anyway, is where the guest data lives, and gets the strict treatment —
   no inline script, nothing framed, no form posting anywhere but here.
   ============================================================ */

const isAdmin = (path: string) => path.startsWith("/admin") || path.startsWith("/api/admin");

function contentSecurityPolicy(strict: boolean, dev: boolean) {
  return [
    "default-src 'self'",
    // dev needs eval for React Refresh; production never does
    strict
      ? `script-src 'self'${dev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`
      : `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    // next/font inlines its @font-face rules, so styles need inline either way
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'" + (dev ? " ws: wss:" : ""),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const dev = process.env.NODE_ENV !== "production";
  const strict = isAdmin(request.nextUrl.pathname);

  const headers: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy(strict, dev),
    // clickjacking, on top of frame-ancestors, for older browsers
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };

  // Two years, preloadable. Only over HTTPS — sending it in dev would pin
  // localhost to https in the browser and be a nuisance to undo.
  if (!dev) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  if (strict) {
    // keep the guest list out of every cache, including the browser's
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
    headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
  }

  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);

  return response;
}

export const config = {
  /* Everything except Next's own static output — those are immutable build
     assets and adding headers to them only costs bytes. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
