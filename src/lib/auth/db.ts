import { prisma } from "@/lib/prisma";
import { User } from "./types";

export async function getUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.passwordHash,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { email } });
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getUserById(id: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createUser(user: User): Promise<User> {
  const row = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: new Date(user.createdAt),
    },
  });
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}
