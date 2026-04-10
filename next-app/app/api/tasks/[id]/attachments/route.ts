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

  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(attachments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, url } = body;
  if (!name || !url) return Response.json({ error: "name and url required" }, { status: 400 });

  const attachment = await prisma.taskAttachment.create({
    data: { taskId: id, name, url },
  });
  return Response.json(attachment, { status: 201 });
}
