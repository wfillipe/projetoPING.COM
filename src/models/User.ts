import db from "../database";
import { User } from "../types";

export const UserModel = {
  findByEmail(email: string) {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
      (User & { password: string }) | undefined;
  },
  create(name: string, email: string, password: string) {
    return db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, password).lastInsertRowid as number;
  },
  findById(id: number) {
    return db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(id) as User | undefined;
  }
};