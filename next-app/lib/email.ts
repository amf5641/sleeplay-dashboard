import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM ?? "Sleeplay Portal <portal@sleeplay.com>";

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; text?: string }) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (result.error) console.error("[email] send failed:", result.error);
    return result;
  } catch (err) {
    console.error("[email] send threw:", err);
    return { error: err };
  }
}
