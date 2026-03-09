import { SignJWT, jwtVerify } from "jose";
import { JWTPayload } from "./types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sms-sat-monitor-secret-key-change-in-prod"
);

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
