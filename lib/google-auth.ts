import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

const SKEW_MS = 60_000;

export async function getFreshGoogleAccessToken(
  userId: string,
): Promise<string | null> {
  const db = await getDb();
  const userObjectId = ObjectId.isValid(userId)
    ? new ObjectId(userId)
    : (userId as unknown as ObjectId);

  const account = await db.collection("account").findOne({
    userId: userObjectId,
    providerId: "google",
  });

  if (!account?.accessToken) return null;

  const expiresAtRaw = account.accessTokenExpiresAt;
  const expiresAt =
    expiresAtRaw instanceof Date
      ? expiresAtRaw
      : expiresAtRaw
        ? new Date(expiresAtRaw)
        : null;

  const stillValid = expiresAt && expiresAt.getTime() - Date.now() > SKEW_MS;
  if (stillValid) return account.accessToken;

  if (!account.refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db.collection("account").updateOne(
    { _id: account._id },
    {
      $set: {
        accessToken: data.access_token,
        accessTokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    },
  );

  return data.access_token;
}
