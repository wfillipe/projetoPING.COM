import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
const db = new Database(config.databasePath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Migrations SQL executadas sequencialmente, cada uma numa transação atômica.
db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
const dir = path.resolve(__dirname, "migrations");
// No build: dist/migrations; no dev com tsx: src/migrations.
const migrationDir = fs.existsSync(dir) ? dir : path.resolve(process.cwd(), "src/migrations");
for (const name of fs.readdirSync(migrationDir).filter(n => /^\d+_.*\.sql$/.test(n)).sort()) {
  const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE filename = ?").get(name);
  if (applied) continue;
  const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations(filename, applied_at) VALUES (?, ?)").run(name, new Date().toISOString());
  })();
  console.log("Migration executada:", name);
}
export default db;
