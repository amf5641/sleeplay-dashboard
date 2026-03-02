import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const categoryId = request.nextUrl.searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;

  const docs = await prisma.contentDocument.findMany({
    where,
    orderBy: { title: "asc" },
  });

  return Response.json(docs);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const doc = await prisma.contentDocument.create({
    data: {
      title: body.title ?? "Untitled",
      categoryId: body.categoryId,
    },
  });

  return Response.json(doc, { status: 201 });
}
