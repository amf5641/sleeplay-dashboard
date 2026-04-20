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
    include: {
      reports: { select: { id: true, name: true, title: true, photo: true } },
      taskCollaborations: {
        select: {
          task: {
            select: {
              project: { select: { id: true, name: true, color: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!person) return Response.json({ error: "Not found" }, { status: 404 });

  // Flatten to distinct projects
  const projectMap = new Map<string, { id: string; name: string; color: string; status: string }>();
  for (const tc of person.taskCollaborations) {
    const p = tc.task.project;
    if (p && !projectMap.has(p.id)) projectMap.set(p.id, p);
  }
  const projects = Array.from(projectMap.values());

  return Response.json({ ...person, projects });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string; role?: string };
  const body = await request.json();
  const data: Record<string, unknown> = {};

  // Check if the user is editing their own profile
  const person = await prisma.person.findUnique({ where: { id }, select: { email: true } });
  const isOwnProfile = person?.email === user.email;
  const isAdmin = user.role === "admin" || user.email === "admin@sleeplay.com";

  if (!isAdmin && !isOwnProfile) {
    return Response.json({ error: "You can only edit your own profile" }, { status: 403 });
  }

  // Admins can edit all fields; non-admins can only edit personal fields
  const fields = isAdmin
    ? ["name", "title", "location", "managerId", "photo", "goals", "hobbies", "interests", "responsibilities", "skills", "startDate", "slack", "phone", "vacationAllowance", "sickAllowance"]
    : ["photo", "goals", "hobbies", "interests", "responsibilities", "skills", "slack", "phone"];

  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const updated = await prisma.person.update({
    where: { id },
    data,
  });

  return Response.json(updated);
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
