import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WINDOW_DAYS = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const people = await prisma.person.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, photo: true, title: true, birthday: true },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming = people.map((p) => {
    const bd = new Date(p.birthday!);
    const m = bd.getUTCMonth();
    const d = bd.getUTCDate();

    // Next occurrence on or after today
    let next = new Date(today.getFullYear(), m, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m, d);

    const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
    return {
      id: p.id,
      name: p.name,
      photo: p.photo,
      title: p.title,
      month: m,
      day: d,
      nextDate: next.toISOString(),
      daysUntil,
      isToday: daysUntil === 0,
    };
  })
    .filter((b) => b.daysUntil <= WINDOW_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return Response.json(upcoming);
}
