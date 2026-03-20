import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendShareEmail = async ({
  toEmail,
  sharedByEmail,
  fileName,
  shareLink,
  permission,
}) => {
  await resend.emails.send({
    from: "CloudVault <onboarding@resend.dev>", // free plan mein yahi use karo
    to: toEmail,
    subject: `${sharedByEmail} ne aapke saath ek file share ki hai`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #f8f9fc; border-radius: 12px;">
        <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1d4ed8; margin-bottom: 8px;">📁 File Shared With You</h2>
          <p style="color: #6b7280; margin-bottom: 24px;">
            <strong style="color: #111827;">${sharedByEmail}</strong> ne tumhare saath ek file share ki hai.
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              📄 <strong>File:</strong> ${fileName}<br/>
              🔐 <strong>Permission:</strong> ${permission === "edit" ? "Editor (Edit kar sakte ho)" : "Viewer (Sirf dekh sakte ho)"}
            </p>
          </div>
          <a href="${shareLink}"
            style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
            📂 File Open Karo
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Yeh email CloudVault se bheja gaya hai.
          </p>
        </div>
      </div>
    `,
  });
};
