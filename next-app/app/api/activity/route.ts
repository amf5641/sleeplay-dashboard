import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "30"), 100);

  const where = projectId ? { projectId } : {};

  const events = await prisma.activityEvent.findMany({
    where,
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json(events);
}
