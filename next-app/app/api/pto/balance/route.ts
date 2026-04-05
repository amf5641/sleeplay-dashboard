import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const personId = request.nextUrl.searchParams.get("personId");
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
