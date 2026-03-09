export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}
