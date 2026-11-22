import { Response } from "express";
import { AuthRequest } from "../types";
import { DeviceModel, Device } from "../models/Device";
import { CheckModel } from "../models/Check";
import { ping, allowedIP } from "../services/monitoring";
import { ApiError } from "../utils/errors";

async function check(device: Device) {
  try { CheckModel.create(device, await ping(device.ip)); }
  catch (err) {
    CheckModel.create(device, { status: "error", latencyMs: null, packetLossPercent: 100,
      message: err instanceof Error ? err.message.slice(0, 200) : "Erro no ping" });
  }
}
function parseId(input: string): number {
  const id = Number(input);
  if (!/^\d+$/.test(input) || !Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "ID de dispositivo inválido.");
  return id;
}
function validate(body: any) {
  const { name, ip, type } = body || {};
  const types = ["computador", "servidor", "roteador", "switch", "outro"];
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80 ||
      typeof ip !== "string" || !allowedIP(ip) || !types.includes(type))
    throw new ApiError(400, "Confira nome (2 a 80 caracteres), IPv4 privado e tipo do dispositivo.");
  return { name: name.trim(), ip, type: type as string };
}
function own(req: AuthRequest): Device {
  const device = DeviceModel.find(parseId(req.params.id), req.user!.id);
  if (!device) throw new ApiError(404, "Dispositivo não encontrado.");
  return device;
}
export const DeviceController = {
  list(req: AuthRequest, res: Response) { res.json(DeviceModel.all(req.user!.id)); },
  get(req: AuthRequest, res: Response) {
    const d = own(req);
    res.json(DeviceModel.all(req.user!.id).find(x => x.id === d.id));
  },
  async create(req: AuthRequest, res: Response) {
    const { name, ip, type } = validate(req.body);
    if (DeviceModel.count(req.user!.id) >= 25) throw new ApiError(400, "Limite de 25 dispositivos por conta.");
    if (DeviceModel.existsIP(req.user!.id, ip)) throw new ApiError(409, "Esse IP já está cadastrado.");
    const id = DeviceModel.create(req.user!.id, name, ip, type);
    const device = DeviceModel.find(id, req.user!.id)!;
    await check(device);
    res.status(201).json(DeviceModel.all(req.user!.id).find(d => d.id === id));
  },
  async update(req: AuthRequest, res: Response) {
    const device = own(req);
    const { name, ip, type } = validate(req.body);
    if (DeviceModel.existsIP(req.user!.id, ip, device.id)) throw new ApiError(409, "Esse IP já está cadastrado.");
    DeviceModel.update(device.id, req.user!.id, name, ip, type);
    if (ip !== device.ip) await check(DeviceModel.find(device.id, req.user!.id)!);
    res.json(DeviceModel.all(req.user!.id).find(d => d.id === device.id));
  },
  async runCheck(req: AuthRequest, res: Response) {
    const device = own(req);
    await check(device);
    res.json(DeviceModel.all(req.user!.id).find(d => d.id === device.id)?.lastCheck);
  },
  remove(req: AuthRequest, res: Response) {
    const d = own(req);
    DeviceModel.delete(d.id, req.user!.id);
    res.json({ ok: true });
  }
};
