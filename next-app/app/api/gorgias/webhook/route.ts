import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GORGIAS_BASE_URL = process.env.GORGIAS_BASE_URL!;
const GORGIAS_EMAIL = process.env.GORGIAS_EMAIL!;
const GORGIAS_API_KEY = process.env.GORGIAS_API_KEY!;

const SYSTEM_PROMPT = `You are a helpful customer service assistant for Sleeplay (sleeplay.com), an e-commerce company that sells CPAP machines, CPAP masks, and CPAP accessories.

Your job is to draft a professional, warm, and concise reply to customer support tickets. A human agent will review your draft before sending it, so write it as if it's ready to send.

Key information about Sleeplay:
- We sell CPAP machines (ResMed AirSense 10, AirSense 11, AirMini, Philips Respironics, etc.), masks (full face, nasal, nasal pillow), and accessories (tubing, filters, humidifiers, travel cases, etc.)
- We ship from our warehouse and process returns/exchanges
- We support customers with insurance, prescriptions, and setup questions
- We are friendly, empathetic, and knowledgeable about CPAP therapy

Guidelines for your draft:
- Start with a warm greeting using the customer's first name if available
- Directly address the customer's question or issue
- Keep it concise (2-4 short paragraphs max)
- End with an offer to help further and a friendly sign-off
- Do NOT make up specific order details, tracking numbers, or policies you're unsure about — instead say "I'll look into this for you"
- Sign off as "Sleeplay Support Team"`;

function gorgiasAuthHeader(): string {
  const credentials = Buffer.from(`${GORGIAS_EMAIL}:${GORGIAS_API_KEY}`).toString("base64");
  return `Basic ${credentials}`;
}

async function postInternalNote(ticketId: number, message: string): Promise<void> {
  const url = `${GORGIAS_BASE_URL}/api/tickets/${ticketId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": gorgiasAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "internal-note",
      body_html: `<p><strong>🤖 Claude AI Draft Reply:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`,
      body_text: `Claude AI Draft Reply:\n\n${message}`,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gorgias API error ${res.status}: ${error}`);
  }
}

async function generateDraftReply(subject: string, customerMessage: string, customerName?: string): Promise<string> {
  const userContent = `Ticket subject: ${subject}\n\nCustomer message:\n${customerMessage}${customerName ? `\n\nCustomer name: ${customerName}` : ""}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: userContent },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

export async function POST(request: NextRequest) {
  // Verify the request has the expected content type
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Invalid content type" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;

  // Only process new customer messages (ticket created or new message from customer)
  if (event !== "ticket-message.created" && event !== "ticket.created") {
    return Response.json({ skipped: true, reason: "Event not handled" });
  }

  const data = payload.data as Record<string, unknown>;
  const ticket = data?.ticket as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;

  if (!ticket || !message) {
    return Response.json({ error: "Missing ticket or message data" }, { status: 400 });
  }

  const ticketId = ticket.id as number;
  const subject = (ticket.subject as string) ?? "No subject";
  const channel = message.channel as string;
  const bodyText = (message.body_text as string) ?? "";

  // Skip internal notes and messages sent by agents (avoid feedback loops)
  if (channel === "internal-note") {
    return Response.json({ skipped: true, reason: "Internal note" });
  }

  const sender = message.sender as Record<string, unknown> | undefined;
  const senderType = sender?.object_type as string | undefined;
  if (senderType === "Agent") {
    return Response.json({ skipped: true, reason: "Agent message" });
  }

  const customerName = (sender?.name as string | undefined)?.split(" ")[0];

  try {
    const draft = await generateDraftReply(subject, bodyText, customerName);
    await postInternalNote(ticketId, draft);
    return Response.json({ success: true, ticketId });
  } catch (err) {
    console.error("Gorgias webhook error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
