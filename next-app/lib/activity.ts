import { prisma } from "@/lib/prisma";

export async function logActivity(
  userId: string,
  projectId: string | null,
  taskId: string | null,
  action: string,
  detail: string,
  metadata: Record<string, unknown> = {}
) {
  return prisma.activityEvent.create({
    data: {
      userId,
      projectId,
      taskId,
      action,
      detail,
      metadata: JSON.stringify(metadata),
    },
  });
}
