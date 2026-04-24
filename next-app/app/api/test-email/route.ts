import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const isAdmin = user?.email === "admin@sleeplay.com" || user?.role === "admin";
  if (!isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const debug: Record<string, unknown> = {
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyPrefix: process.env.RESEND_API_KEY?.slice(0, 6) ?? null,
    from: process.env.RESEND_FROM ?? "(default) Sleeplay Portal <portal@sleeplay.com>",
    portalUrl: process.env.PORTAL_URL ?? "(default) https://portal.sleeplay.com",
    notifyEmail: process.env.PTO_NOTIFY_EMAIL ?? "(default) aaron.fuhrman@sleeplay.com",
  };

  const to = process.env.PTO_NOTIFY_EMAIL ?? "aaron.fuhrman@sleeplay.com";
  const result = await sendEmail({
    to,
    subject: "Sleeplay Portal — test email",
    html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Test email works ✅</h2><p>If you're reading this, Resend is wired up correctly.</p><p style="color: #666; font-size: 12px;">Sent at ${new Date().toISOString()}</p></div>`,
    text: `Test email works. Sent at ${new Date().toISOString()}`,
  });

  return Response.json({ debug, result });
}
