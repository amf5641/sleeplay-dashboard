import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const filter = request.nextUrl.searchParams.get("filter");

  const projects = await prisma.project.findMany({
    include: {
      tasks: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  let filtered = projects;
  if (filter === "complete") {
    filtered = projects.filter(
      (p) => p.tasks.length > 0 && p.tasks.every((t) => t.completed)
    );
  } else if (filter === "incomplete") {
    filtered = projects.filter(
      (p) => p.tasks.length === 0 || p.tasks.some((t) => !t.completed)
    );
  }

  return Response.json(filtered);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      status: body.status ?? "On Track",
      notes: body.notes ?? "",
    },
  });

  return Response.json(project, { status: 201 });
}
