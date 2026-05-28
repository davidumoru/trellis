import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { Resend } from "resend";

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("trellis");

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
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
            from: "Trellis <onboarding@resend.dev>",
            to: email,
            subject: "Your sign-in code",
            text: `Your Trellis sign-in code is: ${otp}\n\nThis code expires in 5 minutes.`,
          });
        }
      },
      otpLength: 6,
      expiresIn: 300,
    }),
    nextCookies(),
  ],
});
