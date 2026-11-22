import db from "../database";
export type Device = { id: number; user_id: number; name: string; ip: string; type: string };
export const DeviceModel = {
  all(userId: number): (Device & { lastCheck: any })[] {
    return (db.prepare(`SELECT d.*, (SELECT json_object('status', c.status, 'latencyMs', c.latency_ms,
      'packetLossPercent', c.packet_loss_percent, 'checkedAt', c.checked_at, 'message', c.message)
      FROM checks c WHERE c.device_id = d.id ORDER BY c.id DESC LIMIT 1) AS lastCheck
      FROM devices d WHERE d.user_id = ? ORDER BY d.name`).all(userId) as (Device & { lastCheck: string | null })[])
      .map(d => ({ ...d, lastCheck: d.lastCheck ? JSON.parse(d.lastCheck) : null }));
  },
  find(id: number, userId: number): Device | undefined {
    return db.prepare("SELECT * FROM devices WHERE id = ? AND user_id = ?").get(id, userId) as Device | undefined;
  },
  create(userId: number, name: string, ip: string, type: string): number {
    return Number(db.prepare("INSERT INTO devices(user_id,name,ip,type) VALUES(?,?,?,?)").run(userId,name,ip,type).lastInsertRowid);
  },
  update(id: number, userId: number, name: string, ip: string, type: string) {
    return db.prepare("UPDATE devices SET name = ?, ip = ?, type = ? WHERE id = ? AND user_id = ?").run(name,ip,type,id,userId);
  },
  delete(id: number, userId: number) {
    return db.prepare("DELETE FROM devices WHERE id = ? AND user_id = ?").run(id,userId);
  },
  count(userId: number): number {
    return (db.prepare("SELECT count(*) AS total FROM devices WHERE user_id = ?").get(userId) as {total:number}).total;
  },
  existsIP(userId: number, ip: string, excludeId = -1): boolean {
    return !!db.prepare("SELECT 1 FROM devices WHERE user_id=? AND ip=? AND id <> ?").get(userId,ip,excludeId);
  },
  allForMonitor(): Device[] { return db.prepare("SELECT * FROM devices").all() as Device[]; }
};
