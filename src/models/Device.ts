import db from "../database";

export const DeviceModel = {
  all(userId: number) {
    return db.prepare(`
      SELECT d.*, (
        SELECT json_object('status', c.status, 'latencyMs', c.latency_ms,
          'packetLossPercent', c.packet_loss_percent, 'checkedAt', c.checked_at,
          'message', c.message)
        FROM checks c WHERE c.device_id = d.id ORDER BY c.id DESC LIMIT 1
      ) AS lastCheck
      FROM devices d WHERE d.user_id = ? ORDER BY d.name
    `).all(userId).map((row: any) => ({
      ...row, lastCheck: row.lastCheck ? JSON.parse(row.lastCheck) : null
    }));
  },
  find(id: number, userId: number) {
    return db.prepare("SELECT * FROM devices WHERE id = ? AND user_id = ?").get(id, userId) as
      { id: number; user_id: number; name: string; ip: string; type: string } | undefined;
  },
  create(userId: number, name: string, ip: string, type: string) {
    return db.prepare("INSERT INTO devices (user_id, name, ip, type) VALUES (?, ?, ?, ?)")
      .run(userId, name, ip, type).lastInsertRowid as number;
  },
  delete(id: number, userId: number) {
    return db.prepare("DELETE FROM devices WHERE id = ? AND user_id = ?").run(id, userId);
  }
};