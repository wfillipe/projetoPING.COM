import { execFile } from "node:child_process";
import { isIP } from "node:net";
import { PingResult } from "../models/Check";

export function allowedIP(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function ping(ip: string): Promise<PingResult> {
  if (!allowedIP(ip)) return Promise.reject(new Error("Informe um IPv4 privado válido."));
  const windows = process.platform === "win32";
  const args = windows ? ["-n", "3", "-w", "1000", ip] : ["-n", "-c", "3", "-W", "1", ip];

  return new Promise((resolve, reject) => {
    execFile(windows ? "ping.exe" : "ping", args, { timeout: 6000 }, (error, stdout = "", stderr = "") => {
      if (error && error.code !== 1) return reject(new Error(stderr || "Falha ao executar ping."));
      const times = [...stdout.matchAll(/(?:time|tempo)[=<]\s*([\d.,]+)\s*ms/gi)]
        .map(m => Number(m[1].replace(",", "."))).filter(Number.isFinite);
      const loss = Math.round((3 - times.length) / 3 * 100);
      if (!times.length) return resolve({ status: "offline", latencyMs: null, packetLossPercent: 100 });
      const latency = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
      resolve({ status: latency >= 100 ? "high_latency" : "online", latencyMs: latency, packetLossPercent: loss });
    });
  });
}