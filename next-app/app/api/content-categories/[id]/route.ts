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

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;

  const category = await prisma.contentCategory.update({ where: { id }, data });
  return Response.json(category);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.contentDocument.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.contentCategory.deleteMany({ where: { parentId: id } });
  await prisma.contentCategory.delete({ where: { id } });

  return Response.json({ success: true });
}
