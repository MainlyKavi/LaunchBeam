import { Resend } from "resend";
import { logServerError } from "@/lib/logger";

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type WelcomeEmailInput = {
  to: string;
  projectName: string;
  position: number;
  referralUrl: string;
  unsubscribeUrl: string;
  confirmationUrl?: string | null;
  referralsEnabled: boolean;
};

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resend || !from) {
    return { sent: false, error: "Email delivery is not configured." };
  }

  const projectName = escapeHtml(input.projectName);
  const confirmation = input.confirmationUrl
    ? `<p><a href="${escapeHtml(input.confirmationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#171719;color:#fff;text-decoration:none;font-weight:600">Confirm your place</a></p>`
    : "";
  const referral = input.referralsEnabled
    ? `<p>Invite friends to move up:</p><p><a href="${escapeHtml(input.referralUrl)}">${escapeHtml(input.referralUrl)}</a></p><p>Milestones: 1 referral - Early supporter; 3 - Priority access; 5 - Founding member.</p>`
    : "";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#19191b;line-height:1.6">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">LaunchBeam waitlist</p>
      <h1 style="font-size:30px;line-height:1.1">You're on the ${projectName} list.</h1>
      <p>Your current position is <strong>#${input.position}</strong>.</p>
      ${confirmation}
      ${referral}
      <p style="margin-top:36px;font-size:12px;color:#777"><a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe from this waitlist</a></p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: `You're on the ${input.projectName} waitlist`,
      html,
    });
    if (error) {
      logServerError("welcome_email_failed", error, {
        projectName: input.projectName,
      });
      return { sent: false, error: "Email delivery failed." };
    }
    return { sent: true };
  } catch (error) {
    logServerError("welcome_email_failed", error, {
      projectName: input.projectName,
    });
    return { sent: false, error: "Email delivery failed." };
  }
}
