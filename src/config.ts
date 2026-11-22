import fs from "node:fs";
import path from "node:path";

const envFile = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const jwtSecret = process.env.JWT_SECRET || "";
if (Buffer.byteLength(jwtSecret, "utf8") < 32 || jwtSecret.startsWith("SUBSTITUA_POR_")) {
  throw new Error("Configure JWT_SECRET com pelo menos 32 bytes no arquivo .env (veja .env.example).");
}
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválida no .env");
export const config = {
  port,
  jwtSecret,
  databasePath: path.resolve(process.env.DB_PATH || "./data/pingcom.db"),
  monitorCron: process.env.MONITOR_CRON || "* * * * *",
  jwtExpiresSeconds: 8 * 60 * 60,
};
