import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

// Receives the gzipped Klaviyo dashboard from the daily launchd job on Aaron's Mac and
// stores it for /klaviyo to serve. Gzipped it is ~1.3 MB, safely under Vercel's 4.5 MB
// request body limit (raw it is ~8 MB, which is why the body must arrive compressed).
//
// The table is created on first use so no schema migration ever has to run against prod.
// Excluded from the auth middleware matcher; a bearer secret gates it instead.
export async function POST(request: NextRequest) {
  const secret = process.env.KLAVIYO_UPLOAD_SECRET;
  if (!secret) {
    // hard-fail rather than fall open like an optional check would
    return Response.json({ error: "KLAVIYO_UPLOAD_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length < 1000 || body[0] !== 0x1f || body[1] !== 0x8b) {
    return Response.json({ error: "Body must be a gzipped HTML file" }, { status: 400 });
  }
  if (body.length > 4 * 1024 * 1024) {
    return Response.json({ error: "Body exceeds 4 MB gzipped" }, { status: 413 });
  }

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS klaviyo_dashboard (
       id INT PRIMARY KEY,
       gzip BYTEA NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );
  await prisma.$executeRaw`
    INSERT INTO klaviyo_dashboard (id, gzip, updated_at)
    VALUES (1, ${body}, now())
    ON CONFLICT (id) DO UPDATE SET gzip = EXCLUDED.gzip, updated_at = now()`;

  return Response.json({ ok: true, bytes: body.length });
}
