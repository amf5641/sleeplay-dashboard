import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  if (!user.email) return Response.json({ error: "No email" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  const notifications = await prisma.notification.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json(notifications);
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  if (!user.email) return Response.json({ error: "No email" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

  await prisma.notification.updateMany({
    where: { userId: dbUser.id, read: false },
    data: { read: true },
  });

  return Response.json({ success: true });
}
