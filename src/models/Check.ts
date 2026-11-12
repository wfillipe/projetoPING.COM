import db from "../database";

export type PingResult = {
  status: string; latencyMs: number | null; packetLossPercent: number; message?: string;
};

export const CheckModel = {
  create(device: { id: number; user_id: number; name: string; ip: string }, result: PingResult) {
    db.prepare(`INSERT INTO checks
      (device_id, user_id, device_name, ip, checked_at, status, latency_ms, packet_loss_percent, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(device.id, device.user_id, device.name, device.ip, new Date().toISOString(),
        result.status, result.latencyMs, result.packetLossPercent, result.message || null);
  },
  history(userId: number, deviceId?: number) {
    return deviceId
      ? db.prepare("SELECT * FROM checks WHERE user_id = ? AND device_id = ? ORDER BY id DESC LIMIT 500").all(userId, deviceId)
      : db.prepare("SELECT * FROM checks WHERE user_id = ? ORDER BY id DESC LIMIT 500").all(userId);
  }
};