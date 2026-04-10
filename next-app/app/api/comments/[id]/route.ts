import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string; role?: string };
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: { author: { select: { email: true } } },
  });
  if (!comment) return Response.json({ error: "Not found" }, { status: 404 });

  if (comment.author.email !== user.email && user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskComment.delete({ where: { id } });
  return Response.json({ success: true });
}
