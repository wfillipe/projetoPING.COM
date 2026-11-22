// JWT HS256 padrão (RFC 7519); utiliza apenas crypto do Node, sem segredos no código.
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import { ApiError } from "./errors";
const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
const signature = (data: string) => createHmac("sha256", config.jwtSecret).update(data).digest("base64url");
export function signToken(userId: number, tokenVersion: number): string {
  const now = Math.floor(Date.now() / 1000);
  const data = encode({ alg: "HS256", typ: "JWT" }) + "." + encode({
    sub: String(userId), ver: tokenVersion, iat: now, exp: now + config.jwtExpiresSeconds,
    iss: "ping.com", aud: "ping.com-client"
  });
  return `${data}.${signature(data)}`;
}
export function verifyToken(token: string): { userId: number; tokenVersion: number } {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 4096) throw new ApiError(401, "Token inválido.");
  const [header, payload, received] = parts;
  const expected = signature(`${header}.${payload}`);
  const a = Buffer.from(received); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiError(401, "Token inválido.");
  try {
    const h = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    const userId = Number(p.sub);
    if (h.alg !== "HS256" || h.typ !== "JWT" || p.iss !== "ping.com" || p.aud !== "ping.com-client" ||
      !Number.isSafeInteger(userId) || userId < 1 || !Number.isInteger(p.ver) || !Number.isInteger(p.exp) ||
      !Number.isInteger(p.iat) || p.exp <= now || p.iat > now + 30 || p.exp - p.iat > config.jwtExpiresSeconds)
      throw new Error("claims inválidas");
    return { userId, tokenVersion: p.ver };
  } catch { throw new ApiError(401, "Token expirado ou inválido. Entre novamente."); }
}
