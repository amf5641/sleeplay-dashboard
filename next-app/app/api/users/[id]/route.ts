import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const caller = session.user as { role?: string };
  if (caller.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();
  const validRoles = ["admin", "manager", "member"];
  if (body.role && !validRoles.includes(body.role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.role !== undefined) data.role = body.role;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return Response.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  if (user.email === session.user?.email) {
    return Response.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return Response.json({ success: true });
}
