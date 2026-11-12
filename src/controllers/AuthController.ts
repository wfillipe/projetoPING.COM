import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";

export const AuthController = {
  async register(req: Request, res: Response) {
    const { name, email, password } = req.body;
    if (!name || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email || "") || !password || password.length < 8)
      return res.status(400).json({ error: "Informe nome, e-mail válido e senha com 8 caracteres." });
    if (UserModel.findByEmail(email.toLowerCase()))
      return res.status(409).json({ error: "E-mail já cadastrado." });
    const id = UserModel.create(name.trim(), email.toLowerCase(), await bcrypt.hash(password, 10));
    req.session.userId = id;
    res.status(201).json(UserModel.findById(id));
  },
  async login(req: Request, res: Response) {
    const user = UserModel.findByEmail(String(req.body.email || "").toLowerCase());
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    req.session.userId = user.id;
    res.json(UserModel.findById(user.id));
  },
  session(req: Request, res: Response) {
    res.json(req.session.userId ? UserModel.findById(req.session.userId) || null : null);
  },
  logout(req: Request, res: Response) {
    req.session.destroy(() => res.json({ ok: true }));
  }
};