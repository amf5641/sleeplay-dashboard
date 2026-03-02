import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) where.title = { contains: search };

  const sops = await prisma.sop.findMany({
    where,
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json(sops);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sop = await prisma.sop.create({
    data: {
      title: body.title ?? "Untitled SOP",
      categoryId: body.categoryId ?? null,
    },
  });

  return Response.json(sop, { status: 201 });
}
