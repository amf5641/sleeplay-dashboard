import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      person: { select: { id: true, name: true, title: true, photo: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
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
