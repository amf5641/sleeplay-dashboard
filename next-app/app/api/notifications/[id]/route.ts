import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  if (!user.email) return Response.json({ error: "No email" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== dbUser.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return Response.json({ success: true });
}
