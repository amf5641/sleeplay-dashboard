import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { validatePassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { role?: string };
  if (sessionUser.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (!body.email || !body.password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const pwCheck = validatePassword(body.password);
  if (!pwCheck.valid) {
    return Response.json({ error: pwCheck.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.update({
    where: { email: body.email },
    data: { passwordHash, mustChangePassword: true },
  });

  return Response.json({ success: true });
}
