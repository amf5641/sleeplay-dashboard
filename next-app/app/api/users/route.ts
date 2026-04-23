import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { validatePassword } from "@/lib/password";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return Response.json(users);
}

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

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return Response.json(user, { status: 201 });
}
