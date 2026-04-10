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

  const template = await prisma.projectTemplate.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { position: "asc" },
        include: { tasks: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!template) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.projectTemplate.delete({ where: { id } });
  return Response.json({ success: true });
}
