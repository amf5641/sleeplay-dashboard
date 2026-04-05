import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      title: body.title ?? "Untitled",
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "On Track",
      notes: body.notes ?? "",
      collaborators: body.collaborators?.length
        ? {
            create: body.collaborators.map((personId: string) => ({
              personId,
            })),
          }
        : undefined,
    },
    include: { collaborators: true },
  });

  return Response.json(task, { status: 201 });
}
