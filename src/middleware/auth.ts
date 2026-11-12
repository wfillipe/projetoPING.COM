import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { UserModel } from "../models/User";

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = req.session.userId ? UserModel.findById(req.session.userId) : undefined;
  if (!user) return res.status(401).json({ error: "Entre na sua conta para continuar." });
  req.user = user;
  next();
}