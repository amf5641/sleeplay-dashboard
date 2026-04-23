import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@sleeplay.com";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const personId = request.nextUrl.searchParams.get("personId");
  const all = request.nextUrl.searchParams.get("all");

  // Admin can request all balances
  const user = session.user as { email?: string; role?: string };
  const isAdmin = user.email === ADMIN_EMAIL || user.role === "admin";
  if (all === "true" && isAdmin) {
    const people = await prisma.person.findMany({
      select: { id: true, name: true, title: true, photo: true, vacationAllowance: true, sickAllowance: true },
      orderBy: { name: "asc" },
    });

    const approvedRequests = await prisma.ptoRequest.findMany({
      where: { status: "approved" },
      select: { personId: true, type: true, days: true },
    });

    const usageMap: Record<string, { vacationUsed: number; sickUsed: number }> = {};
    for (const r of approvedRequests) {
      if (!usageMap[r.personId]) usageMap[r.personId] = { vacationUsed: 0, sickUsed: 0 };
      if (r.type === "vacation") usageMap[r.personId].vacationUsed += r.days;
      else if (r.type === "sick") usageMap[r.personId].sickUsed += r.days;
    }

    const balances = people.map((p) => {
      const usage = usageMap[p.id] || { vacationUsed: 0, sickUsed: 0 };
      return {
        personId: p.id,
        name: p.name,
        title: p.title,
        photo: p.photo,
        vacationAllowance: p.vacationAllowance,
        sickAllowance: p.sickAllowance,
        vacationUsed: usage.vacationUsed,
        sickUsed: usage.sickUsed,
        vacationRemaining: p.vacationAllowance - usage.vacationUsed,
        sickRemaining: p.sickAllowance - usage.sickUsed,
      };
    });

    return Response.json(balances);
  }

  // Single person balance
  if (!personId) return Response.json({ error: "personId required" }, { status: 400 });

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { vacationAllowance: true, sickAllowance: true },
  });

  if (!person) return Response.json({ error: "Person not found" }, { status: 404 });

  const approvedRequests = await prisma.ptoRequest.findMany({
    where: { personId, status: "approved" },
    select: { type: true, days: true },
  });

  let vacationUsed = 0;
  let sickUsed = 0;
  for (const r of approvedRequests) {
    if (r.type === "vacation") vacationUsed += r.days;
    else if (r.type === "sick") sickUsed += r.days;
  }

  return Response.json({
    vacationAllowance: person.vacationAllowance,
    sickAllowance: person.sickAllowance,
    vacationUsed,
    sickUsed,
    vacationRemaining: person.vacationAllowance - vacationUsed,
    sickRemaining: person.sickAllowance - sickUsed,
  });
}
