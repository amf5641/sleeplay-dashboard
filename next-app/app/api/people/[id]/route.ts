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

  const person = await prisma.person.findUnique({
    where: { id },
    include: { reports: true },
  });

  if (!person) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(person);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  const fields = [
    "name",
    "title",
    "location",
    "managerId",
    "photo",
    "goals",
    "hobbies",
    "interests",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const person = await prisma.person.update({
    where: { id },
    data,
  });

  return Response.json(person);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.email !== "admin@sleeplay.com") {
    return Response.json({ error: "Only admin can delete team members" }, { status: 403 });
  }

  // Set managerId to null on direct reports
  await prisma.person.updateMany({
    where: { managerId: id },
    data: { managerId: null },
  });

  await prisma.person.delete({ where: { id } });

  return Response.json({ success: true });
}
