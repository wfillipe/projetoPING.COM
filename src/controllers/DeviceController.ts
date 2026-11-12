import { Response } from "express";
import { AuthRequest } from "../types";
import { DeviceModel } from "../models/Device";
import { CheckModel } from "../models/Check";
import { ping, allowedIP } from "../services/monitoring";

async function check(device: NonNullable<ReturnType<typeof DeviceModel.find>>) {
  try { CheckModel.create(device, await ping(device.ip)); }
  catch (e) {
    CheckModel.create(device, { status: "error", latencyMs: null, packetLossPercent: 100,
      message: e instanceof Error ? e.message : "Erro no ping" });
  }
}

export const DeviceController = {
  list(req: AuthRequest, res: Response) { res.json(DeviceModel.all(req.user!.id)); },
  async create(req: AuthRequest, res: Response) {
    const { name, ip, type } = req.body;
    const types = ["computador", "servidor", "roteador", "switch", "outro"];
    if (!name || name.length > 80 || !allowedIP(ip) || !types.includes(type))
      return res.status(400).json({ error: "Confira nome, IPv4 privado e tipo do dispositivo." });
    if (DeviceModel.all(req.user!.id).length >= 25)
      return res.status(400).json({ error: "Limite de 25 dispositivos por conta." });
    if (DeviceModel.all(req.user!.id).some((d: any) => d.ip === ip))
      return res.status(409).json({ error: "Esse IP já está cadastrado." });
    const id = DeviceModel.create(req.user!.id, name.trim(), ip, type);
    const device = DeviceModel.find(id, req.user!.id)!;
    await check(device);
    res.status(201).json(DeviceModel.all(req.user!.id).find((d: any) => d.id === id));
  },
  async runCheck(req: AuthRequest, res: Response) {
    const device = DeviceModel.find(Number(req.params.id), req.user!.id);
    if (!device) return res.status(404).json({ error: "Dispositivo não encontrado." });
    await check(device);
    res.json(DeviceModel.all(req.user!.id).find((d: any) => d.id === device.id)?.lastCheck);
  },
  remove(req: AuthRequest, res: Response) {
    DeviceModel.delete(Number(req.params.id), req.user!.id);
    res.json({ ok: true });
  }
};