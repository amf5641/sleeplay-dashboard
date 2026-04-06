import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string; id?: string; role?: string };
  const filter = request.nextUrl.searchParams.get("filter");

  // Admins see all projects; members only see projects they're invited to
  const where = user.role === "admin" ? {} : {
    members: { some: { user: { email: user.email } } },
  };

  const projects = await prisma.project.findMany({
    where,
    include: {
      tasks: true,
      members: { include: { user: { select: { id: true, email: true } } } },
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

  const sessionUser = session.user as { email?: string };
  const body = await request.json();

  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      status: body.status ?? "On Track",
      notes: body.notes ?? "",
    },
  });

  // Auto-add the creator as a member
  if (sessionUser.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: sessionUser.email } });
    if (dbUser) {
      await prisma.projectMember.create({ data: { projectId: project.id, userId: dbUser.id } });
    }
  }

  return Response.json(project, { status: 201 });
}
