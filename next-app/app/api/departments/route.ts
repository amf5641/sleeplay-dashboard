import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { projects: true } },
    },
  });

  return Response.json(departments);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin" && user.role !== "manager") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });

  const maxPos = await prisma.department.aggregate({ _max: { position: true } });
  const department = await prisma.department.create({
    data: {
      name: body.name.trim(),
      color: body.color || "#664FA6",
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return Response.json(department, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin" && user.role !== "manager") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });

  // Projects in this department get unlinked (departmentId set to null via onDelete: SetNull)
  await prisma.department.delete({ where: { id } });
  return Response.json({ success: true });
}
