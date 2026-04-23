import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const ADMIN_EMAIL = "admin@sleeplay.com";
const PTO_NOTIFY_EMAIL = process.env.PTO_NOTIFY_EMAIL ?? "aaron.fuhrman@sleeplay.com";
const PORTAL_URL = process.env.PORTAL_URL ?? "https://sleeplay.portal.com";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const personId = request.nextUrl.searchParams.get("personId");
  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, string> = {};
  if (personId) where.personId = personId;
  if (status && status !== "all") where.status = status;

  const requests = await prisma.ptoRequest.findMany({
    where,
    include: {
      person: { select: { id: true, name: true, title: true, photo: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email;
  const body = await request.json();

  // Non-admin users can only create requests for themselves
  if (userEmail !== ADMIN_EMAIL) {
    const person = await prisma.person.findUnique({ where: { email: userEmail! } });
    if (!person || person.id !== body.personId) {
      return Response.json({ error: "You can only create requests for yourself" }, { status: 403 });
    }
  }

  const ptoRequest = await prisma.ptoRequest.create({
    data: {
      personId: body.personId,
      type: body.type ?? "vacation",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      days: body.days,
      note: body.note ?? "",
    },
    include: { person: { select: { name: true, title: true } } },
  });

  // Fire-and-forget email notification to admin
  const person = ptoRequest.person;
  const typeLabel = ptoRequest.type === "sick" ? "Sick" : "Vacation";
  const subject = `PTO Request: ${person.name} — ${ptoRequest.days} ${typeLabel} day${ptoRequest.days !== 1 ? "s" : ""}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #181818; font-size: 20px; margin: 0 0 16px;">New PTO Request</h2>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 20px;">
        <strong>${person.name}</strong>${person.title ? ` (${person.title})` : ""} submitted a PTO request and is waiting for your approval.
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 120px;">Type</td><td style="padding: 6px 0; color: #181818;"><strong>${typeLabel}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Days</td><td style="padding: 6px 0; color: #181818;"><strong>${ptoRequest.days}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Start</td><td style="padding: 6px 0; color: #181818;">${fmtDate(ptoRequest.startDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">End</td><td style="padding: 6px 0; color: #181818;">${fmtDate(ptoRequest.endDate)}</td></tr>
        ${ptoRequest.note ? `<tr><td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Note</td><td style="padding: 6px 0; color: #181818;">${ptoRequest.note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
      </table>
      <a href="${PORTAL_URL}/pto" style="display: inline-block; background: #664FA6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">Review in portal</a>
      <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">
        Log in as <strong>admin@sleeplay.com</strong> to approve or reject this request.
      </p>
    </div>
  `;
  const text = `${person.name} requested ${ptoRequest.days} ${typeLabel.toLowerCase()} day${ptoRequest.days !== 1 ? "s" : ""}\n\nStart: ${fmtDate(ptoRequest.startDate)}\nEnd: ${fmtDate(ptoRequest.endDate)}${ptoRequest.note ? `\nNote: ${ptoRequest.note}` : ""}\n\nReview: ${PORTAL_URL}/pto\nLog in as admin@sleeplay.com to approve.`;

  sendEmail({ to: PTO_NOTIFY_EMAIL, subject, html, text }).catch((err) => console.error("PTO email failed:", err));

  return Response.json(ptoRequest, { status: 201 });
}
