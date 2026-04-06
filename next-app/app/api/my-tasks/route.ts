import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { email?: string };
  if (!user.email) return Response.json([]);

  // Find the Person record matching this user's email
  const person = await prisma.person.findUnique({ where: { email: user.email } });
  if (!person) return Response.json([]);

  // Get all tasks where this person is a collaborator (including subtasks)
  const collaborations = await prisma.taskCollaborator.findMany({
    where: { personId: person.id },
    include: {
      task: {
        include: {
          project: { select: { id: true, name: true } },
          collaborators: { include: { person: true } },
          subtasks: {
            include: {
              collaborators: { include: { person: true } },
            },
            orderBy: [{ completed: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  const tasks = collaborations.map((c) => c.task);

  // Sort: incomplete first, then by due date (nulls last), then by title
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });

  return Response.json(tasks);
}
