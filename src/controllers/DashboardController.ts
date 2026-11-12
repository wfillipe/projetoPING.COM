import { Response } from "express";
import { AuthRequest } from "../types";
import { DeviceModel } from "../models/Device";
import { CheckModel } from "../models/Check";

export const DashboardController = {
  dashboard(req: AuthRequest, res: Response) {
    const devices: any[] = DeviceModel.all(req.user!.id);
    const problems = devices.filter(d => ["offline", "high_latency", "error"].includes(d.lastCheck?.status));
    const statuses = devices.map(d => d.lastCheck?.status);
    res.json({
      summary: {
        total: devices.length,
        online: statuses.filter(s => s === "online" || s === "high_latency").length,
        offline: statuses.filter(s => s === "offline").length,
        highLatency: statuses.filter(s => s === "high_latency").length,
        monitorErrors: statuses.filter(s => s === "error").length,
        lastCheckAt: devices.map(d => d.lastCheck?.checkedAt).filter(Boolean).sort().reverse()[0] || null
      }, devices, problems
    });
  },
  problems(req: AuthRequest, res: Response) {
    const devices: any[] = DeviceModel.all(req.user!.id);
    res.json(devices.filter(d => ["offline", "high_latency", "error"].includes(d.lastCheck?.status)));
  },
  history(req: AuthRequest, res: Response) {
    const id = req.query.deviceId ? Number(req.query.deviceId) : undefined;
    res.json(CheckModel.history(req.user!.id, id));
  }
};