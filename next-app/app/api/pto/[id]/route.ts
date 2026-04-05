import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@sleeplay.com";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Only admin can approve or reject requests" }, { status: 403 });
  }

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

  if (session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Only admin can delete requests" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.ptoRequest.delete({ where: { id } });
  return Response.json({ ok: true });
}
