import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  // body: { customFieldId: string, value: string }

  const result = await prisma.taskCustomFieldValue.upsert({
    where: {
      taskId_customFieldId: { taskId, customFieldId: body.customFieldId },
    },
    create: {
      taskId,
      customFieldId: body.customFieldId,
      value: body.value,
    },
    update: {
      value: body.value,
    },
  });

  return Response.json(result);
}
