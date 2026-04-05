import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const ptoRequest = await prisma.ptoRequest.update({
    where: { id },
    data: {
      status: body.status,
      reviewerId: body.reviewerId ?? null,
    },
  });

  return Response.json(ptoRequest);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.ptoRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "pending") {
    return Response.json({ error: "Can only delete pending requests" }, { status: 400 });
  }

  await prisma.ptoRequest.delete({ where: { id } });
  return Response.json({ ok: true });
}
