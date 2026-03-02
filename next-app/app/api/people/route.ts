import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(people);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const person = await prisma.person.create({
    data: {
      name: body.name,
      title: body.title ?? "",
      location: body.location ?? "",
      managerId: body.managerId ?? null,
      photo: body.photo ?? null,
    },
  });

  return Response.json(person, { status: 201 });
}
