import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@sleeplay.com";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as { email?: string; role?: string };
  const isAdmin = user.email === ADMIN_EMAIL || user.role === "admin";
  return { user, isAdmin };
}

async function isOwner(email: string | undefined, ptoRequestId: string) {
  if (!email) return false;
  const req = await prisma.ptoRequest.findUnique({
    where: { id: ptoRequestId },
    include: { person: { select: { email: true } } },
  });
  return !!req && req.person.email === email;
}

// Admin: approve/reject. Both fields: status, reviewerId.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isAdmin) return Response.json({ error: "Only admin can approve or reject requests" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const ptoRequest = await prisma.ptoRequest.update({
    where: { id },
    data: { status: body.status, reviewerId: body.reviewerId ?? null },
  });

  return Response.json(ptoRequest);
}

// Edit: admin always, owner only while pending. Fields: type, startDate, endDate, days, note.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ptoRequest.findUnique({
    where: { id },
    include: { person: { select: { email: true } } },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const owner = existing.person.email === ctx.user.email;
  if (!ctx.isAdmin) {
    if (!owner) return Response.json({ error: "You can only edit your own requests" }, { status: 403 });
    if (existing.status !== "pending") {
      return Response.json({ error: "Only pending requests can be edited" }, { status: 403 });
    }
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.days !== undefined) data.days = body.days;
  if (body.note !== undefined) data.note = body.note;

  const updated = await prisma.ptoRequest.update({ where: { id }, data });
  return Response.json(updated);
}

// Delete: admin always, owner only while pending (cancel).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ptoRequest.findUnique({
    where: { id },
    include: { person: { select: { email: true } } },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const owner = existing.person.email === ctx.user.email;
  if (!ctx.isAdmin) {
    if (!owner) return Response.json({ error: "You can only cancel your own requests" }, { status: 403 });
    if (existing.status !== "pending") {
      return Response.json({ error: "Only pending requests can be cancelled" }, { status: 403 });
    }
  }

  await prisma.ptoRequest.delete({ where: { id } });
  return Response.json({ ok: true });
}

// Silence unused import warning if isOwner not used
void isOwner;
