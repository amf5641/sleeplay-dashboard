import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOTP, Secret } from "otpauth";
import * as QRCode from "qrcode";
import crypto from "crypto";

// GET — generate a new TOTP secret + QR code for setup
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  if (dbUser.totpEnabled) {
    return Response.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  // Generate secret
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "Sleeplay Portal",
    label: user.email!,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri);

  // Store secret temporarily (not yet enabled)
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { totpSecret: secret.base32 },
  });

  return Response.json({
    qrCode: qrDataUrl,
    secret: secret.base32,
    uri,
  });
}

// POST — verify code and enable 2FA
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser || !dbUser.totpSecret) return Response.json({ error: "Setup not started" }, { status: 400 });

  const body = await request.json();
  const code = body.code?.trim();

  if (!code) return Response.json({ error: "Code required" }, { status: 400 });

  // Verify the code
  const totp = new TOTP({ secret: dbUser.totpSecret, algorithm: "SHA1", digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window: 1 });

  if (delta === null) {
    return Response.json({ error: "Invalid code. Please try again." }, { status: 400 });
  }

  // Generate recovery codes
  const recoveryCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      totpEnabled: true,
      totpRecoveryCodes: JSON.stringify(recoveryCodes),
    },
  });

  return Response.json({ enabled: true, recoveryCodes });
}

// DELETE — disable 2FA
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  const body = await request.json();

  if (!body.password) return Response.json({ error: "Password required" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  // Verify password before disabling
  const bcrypt = await import("bcrypt");
  const valid = await bcrypt.compare(body.password, dbUser.passwordHash);
  if (!valid) return Response.json({ error: "Invalid password" }, { status: 403 });

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { totpEnabled: false, totpSecret: null, totpRecoveryCodes: "[]" },
  });

  return Response.json({ disabled: true });
}
