import test from "node:test";
import assert from "node:assert/strict";
import { classifyPing, isAllowedIPv4, parsePingOutput } from "./monitoring.js";

test("accepts private IPv4 addresses and localhost only", () => {
    assert.equal(isAllowedIPv4("192.168.1.10"), true);
    assert.equal(isAllowedIPv4("10.0.0.1"), true);
    assert.equal(isAllowedIPv4("172.20.0.5"), true);
    assert.equal(isAllowedIPv4("127.0.0.1"), true);
    assert.equal(isAllowedIPv4("8.8.8.8"), false);
    assert.equal(isAllowedIPv4("169.254.169.254"), false);
    assert.equal(isAllowedIPv4("192.168.1.999"), false);
    assert.equal(isAllowedIPv4("example.local"), false);
});

test("parses ping times, including replies below one millisecond", () => {
    assert.deepEqual(
        parsePingOutput("64 bytes from 192.168.1.1: time=4.20 ms\nResposta de 192.168.1.1: tempo=3,7ms\n64 bytes: time<1ms"),
        [4.2, 3.7, 0.5]
    );
});

test("classifies no replies as offline with complete packet loss", () => {
    assert.deepEqual(classifyPing([]), {
        status: "offline",
        latencyMs: null,
        packetLossPercent: 100
    });
});

test("classifies average latency of 100 ms or more as high latency", () => {
    assert.deepEqual(classifyPing([90, 100, 110]), {
        status: "high_latency",
        latencyMs: 100,
        packetLossPercent: 0
    });
    assert.equal(classifyPing([20, 30]).status, "online");
    assert.equal(classifyPing([20, 30]).packetLossPercent, 33);
});
