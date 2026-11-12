import express from "express";
import session from "express-session";
import path from "node:path";
import cron from "node-cron";
import db from "./database";
import api from "./routes";
import { DeviceModel } from "./models/Device";
import { CheckModel } from "./models/Check";
import { ping } from "./services/monitoring";

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "troque-este-segredo-em-producao",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use("/api", api);
app.use(express.static(path.join(process.cwd(), "public")));

async function monitor() {
  const devices = db.prepare("SELECT * FROM devices").all() as any[];
  for (const device of devices) {
    try { CheckModel.create(device, await ping(device.ip)); }
    catch (e) {
      CheckModel.create(device, { status: "error", latencyMs: null, packetLossPercent: 100,
        message: e instanceof Error ? e.message : "Erro no ping" });
    }
  }
}
cron.schedule("* * * * *", () => void monitor());

app.listen(3000, () => console.log("PING.COM em http://localhost:3000"));