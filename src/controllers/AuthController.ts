import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../types";
import { UserModel } from "../models/User";
import { signToken } from "../utils/jwt";
import { ApiError } from "../utils/errors";
export const AuthController = {
  async register(req: AuthRequest, res: Response) {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80 ||
      typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" || password.length < 8 || password.length > 72)
      throw new ApiError(400, "Informe nome (2 a 80), e-mail válido e senha de 8 a 72 caracteres.");
    const normalizedEmail = email.toLowerCase().trim();
    if (UserModel.findByEmail(normalizedEmail)) throw new ApiError(409, "E-mail já cadastrado.");
    const id = UserModel.create(name.trim(), normalizedEmail, await bcrypt.hash(password, 12));
    res.status(201).json({ ...UserModel.findById(id), token: signToken(id, 0) });
  },
  async login(req: AuthRequest, res: Response) {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") throw new ApiError(400, "Informe e-mail e senha.");
    const user = UserModel.findByEmail(email.toLowerCase().trim());
    if (!user || !(await bcrypt.compare(password, user.password))) throw new ApiError(401, "E-mail ou senha incorretos.");
    res.json({ ...UserModel.findById(user.id), token: signToken(user.id, user.token_version) });
  },
  session(req: AuthRequest, res: Response) { res.json(req.user); },
  logout(req: AuthRequest, res: Response) {
    UserModel.revokeTokens(req.user!.id);
    res.json({ ok: true });
  }
};
