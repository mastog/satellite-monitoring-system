import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import { getUserById } from "./db";
import { AuthUser } from "./types";

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser | null> {
  const user = await getAuthUser(req);
  if (!user || user.role !== "admin") return null;
  return user;
}
