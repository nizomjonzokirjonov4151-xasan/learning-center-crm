import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "crm_session";

const secretKey = process.env.SESSION_SECRET ?? "crm-jwt-secret-change-in-production-min-32-chars";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "MANAGER" | "TEACHER";
  fullName: string;
  email: string;
  teacherId: string | null;
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
