import db from "../database";
import { User } from "../types";
type DbUser = User & { password: string; token_version: number };
export const UserModel = {
  findByEmail(email: string): DbUser | undefined {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as DbUser | undefined;
  },
  create(name: string, email: string, password: string): number {
    return Number(db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, password).lastInsertRowid);
  },
  findById(id: number): User | undefined {
    return db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(id) as User | undefined;
  },
  findAuth(id: number): DbUser | undefined {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
  },
  revokeTokens(id: number) { db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(id); }
};
