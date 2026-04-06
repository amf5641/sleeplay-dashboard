import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.options !== undefined) data.options = JSON.stringify(body.options);

  const field = await prisma.customField.update({
    where: { id: fieldId },
    data,
  });

  return Response.json(field);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.customField.delete({ where: { id: fieldId } });
  return Response.json({ success: true });
}
