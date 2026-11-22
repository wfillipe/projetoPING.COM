-- Migração inicial; tabelas com chaves estrangeiras, índices e histórico preservado.
CREATE TABLE users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password TEXT NOT NULL,
 token_version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE devices (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 ip TEXT NOT NULL,
 type TEXT NOT NULL CHECK (type IN ('computador','servidor','roteador','switch','outro')),
 UNIQUE(user_id, ip)
);
CREATE TABLE checks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device_name TEXT NOT NULL,
 ip TEXT NOT NULL,
 checked_at TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('online','offline','high_latency','error')),
 latency_ms REAL,
 packet_loss_percent REAL NOT NULL,
 message TEXT
);
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_checks_user_date ON checks(user_id, id DESC);
CREATE INDEX idx_checks_device_date ON checks(device_id, id DESC);
