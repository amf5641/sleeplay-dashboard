import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return Response.json({ projects: [], tasks: [], sops: [], content: [] });

  const [projects, tasks, sops, content] = await Promise.all([
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" }, parentId: null },
      select: { id: true, title: true, projectId: true, status: true },
      take: 8,
    }),
    prisma.sop.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true },
      take: 5,
    }),
    prisma.contentDocument.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true },
      take: 5,
    }),
  ]);

  return Response.json({ projects, tasks, sops, content });
}
