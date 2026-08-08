import type { Metadata } from "next";
import { getAuth } from "@/lib/auth/session";
import { countAdmins, listAudit, listSessions, usingPostgres } from "@/lib/auth/store";
import { listRsvps, storageMode, summarise } from "@/lib/rsvp-store";
import { mailMode } from "@/lib/mail";
import { wedding } from "@/lib/config";
import AdminSetup from "./AdminSetup";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RSVPs",
  // belt and braces with the X-Robots-Tag set in proxy.ts
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  // No admins yet: offer to create the first one. This closes the moment
  // that account exists — see app/api/admin/setup/route.ts.
  if ((await countAdmins()) === 0) return <AdminSetup />;

  const auth = await getAuth();
  if (!auth) return <AdminLogin />;

  const [rows, sessions, trail] = await Promise.all([
    listRsvps(),
    listSessions(auth.user.id),
    listAudit(12),
  ]);

  return (
    <AdminDashboard
      rows={rows}
      stats={summarise(rows)}
      storage={storageMode()}
      mail={mailMode()}
      authStore={usingPostgres() ? "postgres" : "file"}
      account={{
        email: auth.user.email,
        lastLoginAt: auth.user.lastLoginAt,
        recoveryRemaining: auth.user.recoveryCodes.length,
        totpEnabled: auth.user.totpEnabled,
      }}
      currentSessionId={auth.session.id}
      sessions={sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        ip: s.ip,
        userAgent: s.userAgent,
      }))}
      trail={trail}
      coupleName={`${wedding.bride} & ${wedding.groom}`}
      deadline={wedding.rsvpDeadline}
    />
  );
}
