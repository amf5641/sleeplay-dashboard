import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.projectTemplate.findMany({
    include: {
      sections: {
        orderBy: { position: "asc" },
        include: { _count: { select: { tasks: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, sections } = await request.json();
  if (!name?.trim()) return Response.json({ error: "name required" }, { status: 400 });

  const template = await prisma.projectTemplate.create({
    data: {
      name: name.trim(),
      description: description || "",
      sections: {
        create: (sections || []).map((s: { name: string; tasks?: { title: string; priority?: string }[] }, i: number) => ({
          name: s.name,
          position: i,
          tasks: {
            create: (s.tasks || []).map((t: { title: string; priority?: string }, j: number) => ({
              title: t.title,
              priority: t.priority || "medium",
              position: j,
            })),
          },
        })),
      },
    },
    include: { sections: { include: { tasks: true } } },
  });

  return Response.json(template, { status: 201 });
}
