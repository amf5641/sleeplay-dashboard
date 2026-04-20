import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAccrued } from "@/lib/pto-accrual";

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
      select: { id: true, name: true, title: true, photo: true, vacationAllowance: true, sickAllowance: true, startDate: true },
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
      const vacationAccrued = calculateAccrued(p.vacationAllowance, p.startDate);
      const sickAccrued = calculateAccrued(p.sickAllowance, p.startDate);
      return {
        personId: p.id,
        name: p.name,
        title: p.title,
        photo: p.photo,
        vacationAllowance: p.vacationAllowance,
        sickAllowance: p.sickAllowance,
        vacationAccrued,
        sickAccrued,
        vacationUsed: usage.vacationUsed,
        sickUsed: usage.sickUsed,
        vacationRemaining: Math.round((vacationAccrued - usage.vacationUsed) * 100) / 100,
        sickRemaining: Math.round((sickAccrued - usage.sickUsed) * 100) / 100,
      };
    });

    return Response.json(balances);
  }

  // Single person balance
  if (!personId) return Response.json({ error: "personId required" }, { status: 400 });

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { vacationAllowance: true, sickAllowance: true, startDate: true },
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

  const vacationAccrued = calculateAccrued(person.vacationAllowance, person.startDate);
  const sickAccrued = calculateAccrued(person.sickAllowance, person.startDate);

  return Response.json({
    vacationAllowance: person.vacationAllowance,
    sickAllowance: person.sickAllowance,
    vacationAccrued,
    sickAccrued,
    vacationUsed,
    sickUsed,
    vacationRemaining: Math.round((vacationAccrued - vacationUsed) * 100) / 100,
    sickRemaining: Math.round((sickAccrued - sickUsed) * 100) / 100,
  });
}
