import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { validatePassword } from "@/lib/password";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string; email?: string };
  const body = await request.json();

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: "Current and new password required" }, { status: 400 });
  }

  const pwCheck = validatePassword(body.newPassword);
  if (!pwCheck.valid) {
    return Response.json({ error: pwCheck.error }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  // Verify current password (skip check if mustChangePassword and current matches stored)
  const validCurrent = await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
  if (!validCurrent) {
    return Response.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  if (body.currentPassword === body.newPassword) {
    return Response.json({ error: "New password must be different from current password" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return Response.json({ success: true });
}
