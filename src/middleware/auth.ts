import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { UserModel } from "../models/User";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/errors";
export function auth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) throw new ApiError(401, "Entre na sua conta para continuar.");
    const { userId, tokenVersion } = verifyToken(header.slice(7));
    const user = UserModel.findAuth(userId);
    if (!user || user.token_version !== tokenVersion) throw new ApiError(401, "Sessão encerrada. Entre novamente.");
    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (err) { next(err); }
}
