import express from "express";
import path from "node:path";
import cron from "node-cron";
import { config } from "./config";
import "./database";
import api from "./routes";
import { DeviceModel } from "./models/Device";
import { CheckModel } from "./models/Check";
import { ping } from "./services/monitoring";
import { errorHandler, notFound } from "./utils/errors";

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use("/api", api);
app.use(express.static(path.resolve(process.cwd(), "public")));
app.use(notFound);
app.use(errorHandler);
let running = false;
async function monitor() {
  if (running) return;
  running = true;
  try {
    for (const d of DeviceModel.allForMonitor()) {
      try { CheckModel.create(d, await ping(d.ip)); }
      catch (e) {
        CheckModel.create(d, { status: "error", latencyMs: null, packetLossPercent: 100,
          message: e instanceof Error ? e.message.slice(0, 200) : "Erro no ping" });
      }
    }
  } finally { running = false; }
}
if (!cron.validate(config.monitorCron)) throw new Error("MONITOR_CRON inválido no .env");
cron.schedule(config.monitorCron, () => void monitor().catch(console.error));
app.listen(config.port, () => console.log(`PING.COM em http://localhost:${config.port}`));
