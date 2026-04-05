import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@sleeplay.com";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const personId = request.nextUrl.searchParams.get("personId");
  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, string> = {};
  if (personId) where.personId = personId;
  if (status && status !== "all") where.status = status;

  const requests = await prisma.ptoRequest.findMany({
    where,
    include: {
      person: { select: { id: true, name: true, title: true, photo: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email;
  const body = await request.json();

  // Non-admin users can only create requests for themselves
  if (userEmail !== ADMIN_EMAIL) {
    const person = await prisma.person.findUnique({ where: { email: userEmail! } });
    if (!person || person.id !== body.personId) {
      return Response.json({ error: "You can only create requests for yourself" }, { status: 403 });
    }
  }

  const ptoRequest = await prisma.ptoRequest.create({
    data: {
      personId: body.personId,
      type: body.type ?? "vacation",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      days: body.days,
      note: body.note ?? "",
    },
  });

  return Response.json(ptoRequest, { status: 201 });
}
