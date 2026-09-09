import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Serves the Klaviyo dashboard uploaded by /api/klaviyo-upload. The stored bytes are
// already gzipped, so they are passed through untouched with Content-Encoding: gzip;
// the browser inflates them. That keeps the response under Vercel's 4.5 MB function
// response limit (the inflated page is ~8 MB).
//
// The auth middleware already gates this path; the session check here is defense in
// depth so a future matcher edit cannot silently expose revenue data.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.redirect(new URL("/login", process.env.NEXTAUTH_URL || "https://sleeplay-dashboard.vercel.app"));
  }

  let rows: { gzip: Buffer; updated_at: Date }[] = [];
  try {
    rows = await prisma.$queryRaw`
      SELECT gzip, updated_at FROM klaviyo_dashboard WHERE id = 1`;
  } catch {
    // table does not exist yet: same outcome as no upload
  }
  if (!rows.length) {
    return new Response(
      "<h1 style='font-family:sans-serif'>No dashboard uploaded yet</h1><p style='font-family:sans-serif'>The daily job has not pushed a Klaviyo dashboard. It uploads every morning at 8:30 AM ET.</p>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new Response(new Uint8Array(rows[0].gzip), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Encoding": "gzip",
      // per-user gated content: never let a shared cache hold it
      "Cache-Control": "private, no-store",
      "Last-Modified": rows[0].updated_at.toUTCString(),
    },
  });
}
