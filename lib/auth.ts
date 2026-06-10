import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { mongoClient } from "./mongodb";

const db = mongoClient.db("trellis");

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: mongodbAdapter(db, { client: mongoClient }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      accessType: "offline",
      prompt: "consent",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "email-otp"],
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          await resend.emails.send({
            from: "Trellis <auth@send.davidumoru.me>",
            to: email,
            subject: "Your sign-in code",
            text: `Use this code to sign in to Trellis: ${otp}\n\nThis code expires in 5 minutes. If you didn't try to sign in, you can ignore this email.`,
            html: signInEmailHtml(otp),
          });
        }
      },
      otpLength: 6,
      expiresIn: 300,
    }),
    nextCookies(),
  ],
});

function signInEmailHtml(otp: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Your sign-in code</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:440px;">
            <tr>
              <td style="padding-bottom:32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:8px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="16" height="16" style="border-collapse:separate;border-spacing:1px;">
                        <tr>
                          <td width="7" height="7" style="background:#0a0a0a;border-radius:1px;"></td>
                          <td width="7" height="7" style="background:#0a0a0a;opacity:0.4;border-radius:1px;"></td>
                        </tr>
                        <tr>
                          <td width="7" height="7" style="background:#0a0a0a;opacity:0.4;border-radius:1px;"></td>
                          <td width="7" height="7" style="background:#0a0a0a;border-radius:1px;"></td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align:middle;font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#0a0a0a;">Trellis</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:20px;font-size:15px;line-height:1.5;color:#0a0a0a;">
                Use the code below to sign in to Trellis.
              </td>
            </tr>
            <tr>
              <td style="background:#f4f4f5;border-radius:8px;padding:28px;text-align:center;font-family:'SF Mono',Menlo,Monaco,Consolas,'Courier New',monospace;font-size:30px;font-weight:600;letter-spacing:0.25em;color:#0a0a0a;">
                ${otp}
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;font-size:13px;line-height:1.55;color:#6b6b6b;">
                This code is only valid for the next 5 minutes. If you didn’t try to sign in, you can safely ignore this email.
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;border-top:1px solid #e4e4e7;"></td>
            </tr>
            <tr>
              <td style="padding-top:16px;font-size:12px;color:#9a9a9a;">
                Trellis
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
