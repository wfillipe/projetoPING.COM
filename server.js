import { createServer } from "node:http";
import { randomBytes, randomUUID, scrypt as scryptCallback, createHmac, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isAllowedIPv4, pingIPv4 } from "./monitoring.js";

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const databasePath = join(root, "db.json");
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const sessionDurationSeconds = 7 * 24 * 60 * 60;
const checkIntervalMs = 60 * 1000;
const maxDevicesPerUser = 25;
const deviceTypes = new Set(["computador", "servidor", "roteador", "switch", "outro"]);
const cookieName = "pingsid";
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
};
const staticFiles = new Set(["index.html", "style.css", "script.js"]);
let database;
let writeQueue = Promise.resolve();

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function loadDatabase() {
    const content = await readFile(databasePath, "utf8");
    const data = JSON.parse(content);
    if (!Array.isArray(data.testes)) data.testes = [];
    if (!Array.isArray(data.usuarios)) data.usuarios = [];
    if (!Array.isArray(data.dispositivos)) data.dispositivos = [];
    if (!Array.isArray(data.verificacoes)) data.verificacoes = [];
    return data;
}

function persistDatabase() {
    const serialized = `${JSON.stringify(database, null, 2)}\n`;
    const operation = writeQueue.then(async () => {
        const temporaryPath = `${databasePath}.tmp`;
        await writeFile(temporaryPath, serialized, { mode: 0o600 });
        await rename(temporaryPath, databasePath);
    });
    writeQueue = operation.catch(() => {});
    return operation;
}

function sendJson(response, status, value, extraHeaders = {}) {
    response.writeHead(status, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...extraHeaders
    });
    response.end(JSON.stringify(value));
}

async function readJsonBody(request, limit = 32 * 1024) {
    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
        length += chunk.length;
        if (length > limit) throw new HttpError(413, "Corpo da requisição muito grande.");
        chunks.push(chunk);
    }
    try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new HttpError(400, "O corpo da requisição deve ser um objeto JSON.");
        }
        return body;
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(400, "JSON inválido.");
    }
}

function getCookie(request, name) {
    const cookies = (request.headers.cookie || "").split(";");
    for (const cookie of cookies) {
        const separator = cookie.indexOf("=");
        if (separator < 0) continue;
        if (cookie.slice(0, separator).trim() === name) return cookie.slice(separator + 1).trim();
    }
    return "";
}

function signSession(userId, expiresAt) {
    const payload = `${userId}.${expiresAt}`;
    const signature = createHmac("sha256", sessionSecret).update(payload).digest("hex");
    return `${payload}.${signature}`;
}

function readSession(request) {
    const token = getCookie(request, cookieName);
    const [userId, expiryText, signature, extra] = token.split(".");
    if (!userId || !expiryText || !signature || extra !== undefined) return null;
    const expiresAt = Number(expiryText);
    if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return null;
    const expected = createHmac("sha256", sessionSecret)
        .update(`${userId}.${expiresAt}`)
        .digest();
    let supplied;
    try {
        supplied = Buffer.from(signature, "hex");
    } catch {
        return null;
    }
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    return database.usuarios.find((user) => user.id === userId) || null;
}

function sessionCookie(userId) {
    const expiresAt = Date.now() + sessionDurationSeconds * 1000;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${cookieName}=${signSession(userId, expiresAt)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}${secure}`;
}

function clearSessionCookie() {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email };
}

function requireUser(request) {
    const user = readSession(request);
    if (!user) throw new HttpError(401, "Entre na sua conta para continuar.");
    return user;
}

function latestChecksByDevice(userId) {
    const latest = new Map();
    for (const check of database.verificacoes) {
        if (check.userId !== userId) continue;
        const current = latest.get(check.deviceId);
        if (!current || check.checkedAt > current.checkedAt) latest.set(check.deviceId, check);
    }
    return latest;
}

function getUserDevices(userId) {
    const latest = latestChecksByDevice(userId);
    return database.dispositivos
        .filter((device) => device.userId === userId)
        .map((device) => ({ ...device, lastCheck: latest.get(device.id) || null }))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

async function checkDevice(device) {
    let result;
    try {
        result = await pingIPv4(device.ip);
    } catch (error) {
        result = {
            status: "error",
            latencyMs: null,
            packetLossPercent: null,
            message: error.message
        };
    }

    if (!database.dispositivos.some((current) => current.id === device.id)) return null;
    const check = {
        id: randomUUID(),
        userId: device.userId,
        deviceId: device.id,
        deviceName: device.name,
        ip: device.ip,
        checkedAt: new Date().toISOString(),
        ...result
    };
    database.verificacoes.push(check);
    await persistDatabase();
    return check;
}

let checkCycleRunning = false;

async function runScheduledChecks() {
    if (checkCycleRunning) return;
    checkCycleRunning = true;
    try {
        for (const device of [...database.dispositivos]) {
            try {
                await checkDevice(device);
            } catch (error) {
                console.error(`Falha ao salvar verificação de ${device.name}:`, error);
            }
        }
    } finally {
        checkCycleRunning = false;
    }
}

function dashboardForUser(userId) {
    const devices = getUserDevices(userId);
    const lastChecks = devices
        .map((device) => device.lastCheck)
        .filter(Boolean)
        .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
    const problems = devices
        .filter((device) => ["offline", "high_latency", "error"].includes(device.lastCheck?.status))
        .sort((left, right) => right.lastCheck.checkedAt.localeCompare(left.lastCheck.checkedAt));

    return {
        summary: {
            total: devices.length,
            online: devices.filter((device) => ["online", "high_latency"].includes(device.lastCheck?.status)).length,
            offline: devices.filter((device) => device.lastCheck?.status === "offline").length,
            highLatency: devices.filter((device) => device.lastCheck?.status === "high_latency").length,
            monitorErrors: devices.filter((device) => device.lastCheck?.status === "error").length,
            lastCheckAt: lastChecks[0]?.checkedAt || null
        },
        problems,
        devices
    };
}

async function handleApi(request, response, url) {
    const path = url.pathname;

    if (request.method === "GET" && path === "/api/auth/session") {
        const user = readSession(request);
        return sendJson(response, 200, user ? publicUser(user) : null);
    }

    if (request.method === "GET" && path === "/api/dashboard") {
        const user = requireUser(request);
        return sendJson(response, 200, dashboardForUser(user.id));
    }

    if (request.method === "POST" && path === "/api/auth/register") {
        const body = await readJsonBody(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (name.length < 2 || name.length > 80) throw new HttpError(400, "Informe um nome entre 2 e 80 caracteres.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            throw new HttpError(400, "Informe um e-mail válido.");
        }
        if (password.length < 8 || password.length > 200) {
            throw new HttpError(400, "A senha deve ter entre 8 e 200 caracteres.");
        }
        if (database.usuarios.some((user) => user.email === email)) {
            throw new HttpError(409, "Já existe uma conta com esse e-mail.");
        }

        const salt = randomBytes(16).toString("hex");
        const passwordHash = (await scrypt(password, salt, 64)).toString("hex");
        const user = {
            id: randomUUID(),
            name,
            email,
            salt,
            passwordHash,
            createdAt: new Date().toISOString()
        };
        database.usuarios.push(user);
        await persistDatabase();
        return sendJson(response, 201, publicUser(user), { "Set-Cookie": sessionCookie(user.id) });
    }

    if (request.method === "POST" && path === "/api/auth/login") {
        const body = await readJsonBody(request);
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const user = database.usuarios.find((candidate) => candidate.email === email);
        const passwordHash = user
            ? (await scrypt(password, user.salt, 64)).toString("hex")
            : "";
        const valid = Boolean(
            user &&
            passwordHash.length === user.passwordHash.length &&
            timingSafeEqual(Buffer.from(passwordHash, "hex"), Buffer.from(user.passwordHash, "hex"))
        );
        if (!valid) throw new HttpError(401, "E-mail ou senha incorretos.");
        return sendJson(response, 200, publicUser(user), { "Set-Cookie": sessionCookie(user.id) });
    }

    if (request.method === "POST" && path === "/api/auth/logout") {
        return sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    }

    if (request.method === "GET" && path === "/api/devices") {
        const user = requireUser(request);
        return sendJson(response, 200, getUserDevices(user.id));
    }

    if (request.method === "POST" && path === "/api/devices") {
        const user = requireUser(request);
        const body = await readJsonBody(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const ip = typeof body.ip === "string" ? body.ip.trim() : "";
        const type = typeof body.type === "string" ? body.type : "";
        if (name.length < 1 || name.length > 80) {
            throw new HttpError(400, "O nome deve ter entre 1 e 80 caracteres.");
        }
        if (!isAllowedIPv4(ip)) {
            throw new HttpError(400, "Informe um IPv4 privado válido (10.x, 172.16–31.x, 192.168.x) ou localhost (127.x).");
        }
        if (!deviceTypes.has(type)) throw new HttpError(400, "Selecione um tipo de dispositivo válido.");
        const userDevices = database.dispositivos.filter((device) => device.userId === user.id);
        if (userDevices.length >= maxDevicesPerUser) {
            throw new HttpError(400, `O limite desta versão é ${maxDevicesPerUser} dispositivos por conta.`);
        }
        if (userDevices.some((device) => device.ip === ip)) {
            throw new HttpError(409, "Esse endereço IP já está cadastrado na sua conta.");
        }

        const device = {
            id: randomUUID(),
            userId: user.id,
            name,
            ip,
            type,
            createdAt: new Date().toISOString()
        };
        database.dispositivos.push(device);
        await persistDatabase();
        const lastCheck = await checkDevice(device);
        return sendJson(response, 201, { ...device, lastCheck });
    }

    const deviceRoute = path.match(/^\/api\/devices\/([^/]+)(?:\/check)?$/);
    if (deviceRoute) {
        const user = requireUser(request);
        const deviceId = decodeURIComponent(deviceRoute[1]);
        const device = database.dispositivos.find(
            (candidate) => candidate.id === deviceId && candidate.userId === user.id
        );
        if (!device) throw new HttpError(404, "Dispositivo não encontrado.");

        if (request.method === "GET" && path === `/api/devices/${deviceRoute[1]}`) {
            const latest = latestChecksByDevice(user.id).get(device.id) || null;
            return sendJson(response, 200, { ...device, lastCheck: latest });
        }

        if (request.method === "POST" && path === `/api/devices/${deviceRoute[1]}/check`) {
            const check = await checkDevice(device);
            if (!check) throw new HttpError(404, "Dispositivo não encontrado.");
            return sendJson(response, 201, check);
        }

        if (request.method === "DELETE" && path === `/api/devices/${deviceRoute[1]}`) {
            database.dispositivos = database.dispositivos.filter(
                (candidate) => candidate.id !== device.id
            );
            await persistDatabase();
            return sendJson(response, 200, { ok: true });
        }
    }

    if (request.method === "GET" && path === "/api/problems") {
        const user = requireUser(request);
        return sendJson(response, 200, dashboardForUser(user.id).problems);
    }

    if (request.method === "GET" && path === "/api/history") {
        const user = requireUser(request);
        const deviceId = url.searchParams.get("deviceId");
        if (deviceId && !database.dispositivos.some(
            (device) => device.id === deviceId && device.userId === user.id
        )) {
            throw new HttpError(404, "Dispositivo não encontrado.");
        }

        const checks = database.verificacoes
            .filter((check) =>
                check.userId === user.id &&
                (!deviceId || check.deviceId === deviceId)
            )
            .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt))
            .slice(0, 500);
        return sendJson(response, 200, checks);
    }

    throw new HttpError(404, "Rota não encontrada.");
}

async function serveStatic(request, response, url) {
    const requestedFile = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    if (!staticFiles.has(requestedFile)) throw new HttpError(404, "Página não encontrada.");
    const content = await readFile(join(root, requestedFile));
    response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": String(content.length),
        "Content-Type": mimeTypes[extname(requestedFile)]
    });
    response.end(request.method === "HEAD" ? undefined : content);
}

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
        if (url.pathname.startsWith("/api/")) {
            await handleApi(request, response, url);
        } else if (request.method === "GET" || request.method === "HEAD") {
            await serveStatic(request, response, url);
        } else {
            throw new HttpError(405, "Método não permitido.");
        }
    } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        if (status === 500) console.error("Erro ao processar requisição:", error);
        if (!response.headersSent) {
            sendJson(response, status, {
                error: status === 500 ? "Erro interno do servidor." : error.message
            });
        } else {
            response.destroy(error);
        }
    }
});

try {
    database = await loadDatabase();
    server.listen(port, () => {
        console.log(`PING.COM disponível em http://localhost:${port}`);
        setTimeout(() => {
            void runScheduledChecks();
        }, 1500).unref();
        setInterval(() => {
            void runScheduledChecks();
        }, checkIntervalMs).unref();
    });
} catch (error) {
    console.error("Não foi possível iniciar o servidor ou carregar db.json:", error);
    process.exitCode = 1;
}
