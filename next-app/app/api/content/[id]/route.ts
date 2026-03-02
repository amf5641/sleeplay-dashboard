import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.contentDocument.findUnique({
    where: { id },
  });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(doc);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  const fields = ["title", "content", "categoryId"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const doc = await prisma.contentDocument.update({
    where: { id },
    data,
  });

  return Response.json(doc);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.contentDocument.delete({ where: { id } });
  return Response.json({ success: true });
}
