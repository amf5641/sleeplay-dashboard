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

  const fields = await prisma.customField.findMany({
    where: { projectId: id },
    orderBy: { position: "asc" },
  });

  return Response.json(fields);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const maxPos = await prisma.customField.aggregate({
    where: { projectId: id },
    _max: { position: true },
  });

  const field = await prisma.customField.create({
    data: {
      projectId: id,
      name: body.name || "New Field",
      type: body.type || "text",
      options: body.options ? JSON.stringify(body.options) : "[]",
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return Response.json(field, { status: 201 });
}
