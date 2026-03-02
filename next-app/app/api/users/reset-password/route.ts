import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.email || !body.password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.update({
    where: { email: body.email },
    data: { passwordHash },
  });

  return Response.json({ success: true });
}
