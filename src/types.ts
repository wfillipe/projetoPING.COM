import { Request } from "express";

export type User = { id: number; name: string; email: string };
export type AuthRequest = Request & { user?: User };

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}