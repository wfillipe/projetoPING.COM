import { execFile } from "node:child_process";
import { isIP } from "node:net";

const PACKET_COUNT = 3;

export function isAllowedIPv4(address) {
    if (isIP(address) !== 4) return false;

    const octets = address.split(".").map(Number);
    const [first, second] = octets;
    return first === 10 ||
        first === 127 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168);
}

export function classifyPing(latencies, packetCount = PACKET_COUNT) {
    const packetLossPercent = Math.round(((packetCount - latencies.length) / packetCount) * 100);

    if (!latencies.length) {
        return {
            status: "offline",
            latencyMs: null,
            packetLossPercent
        };
    }

    const latencyMs = Number(
        (latencies.reduce((total, latency) => total + latency, 0) / latencies.length).toFixed(2)
    );

    return {
        status: latencyMs >= 100 ? "high_latency" : "online",
        latencyMs,
        packetLossPercent
    };
}

export function parsePingOutput(output) {
    const latencies = [];
    const pattern = /\b(?:time|tempo)([=<])\s*([\d.,]+)\s*ms\b/gi;

    for (const match of output.matchAll(pattern)) {
        const latency = Number(match[2].replace(",", "."));
        if (Number.isFinite(latency)) {
            latencies.push(match[1] === "<" ? Math.min(latency, 0.5) : latency);
        }
    }

    return latencies;
}

function pingArguments(address) {
    if (process.platform === "win32") {
        return ["-n", String(PACKET_COUNT), "-w", "1000", address];
    }

    const waitTime = process.platform === "darwin" ? "1000" : "1";
    return ["-n", "-c", String(PACKET_COUNT), "-W", waitTime, address];
}

export function pingIPv4(address) {
    if (!isAllowedIPv4(address)) {
        return Promise.reject(new Error("O monitoramento aceita apenas IPv4 de rede privada ou localhost."));
    }

    return new Promise((resolve, reject) => {
        const command = process.platform === "win32" ? "ping.exe" : "ping";
        execFile(
            command,
            pingArguments(address),
            { timeout: 6000, maxBuffer: 16 * 1024, windowsHide: true },
            (error, stdout = "", stderr = "") => {
                if (error?.code === "ENOENT") {
                    reject(new Error("Comando ping não encontrado. Instale/ative o utilitário ping neste servidor."));
                    return;
                }

                if (error && !error.killed && error.code !== 1) {
                    reject(new Error(stderr.trim() || "Não foi possível executar o comando ping."));
                    return;
                }

                const latencies = parsePingOutput(stdout);
                resolve(classifyPing(latencies));
            }
        );
    });
}
