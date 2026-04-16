import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { totpEnabled: true },
  });

  return Response.json({ enabled: dbUser?.totpEnabled || false });
}
