import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const deps = await prisma.taskDependency.findMany({
    where: { taskId: id },
    include: { blockedByTask: { select: { id: true, title: true, completed: true } } },
  });
  const blocks = await prisma.taskDependency.findMany({
    where: { blockedByTaskId: id },
    include: { task: { select: { id: true, title: true, completed: true } } },
  });

  return Response.json({ dependsOn: deps, blocks });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { blockedByTaskId } = await request.json();
  if (!blockedByTaskId || blockedByTaskId === id) {
    return Response.json({ error: "Invalid dependency" }, { status: 400 });
  }

  // Check for circular dependency
  const checkCircular = async (fromId: string, targetId: string): Promise<boolean> => {
    const deps = await prisma.taskDependency.findMany({ where: { taskId: fromId } });
    for (const dep of deps) {
      if (dep.blockedByTaskId === targetId) return true;
      if (await checkCircular(dep.blockedByTaskId, targetId)) return true;
    }
    return false;
  };
  if (await checkCircular(blockedByTaskId, id)) {
    return Response.json({ error: "Circular dependency detected" }, { status: 400 });
  }

  const dep = await prisma.taskDependency.create({
    data: { taskId: id, blockedByTaskId },
    include: { blockedByTask: { select: { id: true, title: true, completed: true } } },
  });

  return Response.json(dep, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { blockedByTaskId } = await request.json();
  await prisma.taskDependency.deleteMany({
    where: { taskId: id, blockedByTaskId },
  });

  return Response.json({ success: true });
}
