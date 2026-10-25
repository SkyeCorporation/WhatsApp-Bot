import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export interface BotUser {
  id: number;
  name: string;
  nomor: string;
  status: "banned" | "unbanned";
  bannedReason: string;
  money: number;
}

export interface UserStats {
  totalUsers: number;
  bannedUsers: number;
}

const dataDirectory = path.resolve(process.env.ESDEATH_DATA_DIR ?? path.join(process.cwd(), "data"));
fs.mkdirSync(dataDirectory, { recursive: true });

export const databasePath = path.join(dataDirectory, "database.sqlite");

export class UserDatabase {
  private readonly db: Database.Database;

  constructor(filePath = databasePath) {
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT 'unknown',
        nomor TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'unbanned'
          CHECK (status IN ('banned', 'unbanned')),
        bannedReason TEXT NOT NULL DEFAULT 'None',
        money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0)
      )
    `);
  }

  getOrCreate(nomor: string, name = "unknown"): BotUser {
    const safeName = name.trim().slice(0, 80) || "unknown";
    this.db.prepare(`
      INSERT INTO users (name, nomor)
      VALUES (?, ?)
      ON CONFLICT(nomor) DO UPDATE SET
        name = CASE
          WHEN users.name = 'unknown' AND excluded.name <> 'unknown' THEN excluded.name
          ELSE users.name
        END
    `).run(safeName, nomor);
    const user = this.getByPhone(nomor);
    if (!user) throw new Error("SQLite failed to return a user after upsert");
    return user;
  }

  getByPhone(nomor: string): BotUser | null {
    return (this.db.prepare("SELECT * FROM users WHERE nomor = ?").get(nomor) as BotUser | undefined) ?? null;
  }

  listUsers(limit = 500): BotUser[] {
    return this.db.prepare("SELECT * FROM users ORDER BY id DESC LIMIT ?").all(limit) as BotUser[];
  }

  getStats(): UserStats {
    const result = this.db.prepare(`
      SELECT COUNT(*) AS totalUsers,
             SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) AS bannedUsers
      FROM users
    `).get() as { totalUsers: number; bannedUsers: number | null };
    return { totalUsers: result.totalUsers, bannedUsers: result.bannedUsers ?? 0 };
  }

  setBanned(nomor: string, reason: string): BotUser | null {
    this.db.prepare(`
      INSERT INTO users (nomor, status, bannedReason)
      VALUES (?, 'banned', ?)
      ON CONFLICT(nomor) DO UPDATE SET status = 'banned', bannedReason = excluded.bannedReason
    `).run(nomor, reason.slice(0, 300) || "None");
    return this.getByPhone(nomor);
  }

  setUnbanned(nomor: string): BotUser | null {
    this.db.prepare(`
      INSERT INTO users (nomor, status, bannedReason)
      VALUES (?, 'unbanned', 'None')
      ON CONFLICT(nomor) DO UPDATE SET status = 'unbanned', bannedReason = 'None'
    `).run(nomor);
    return this.getByPhone(nomor);
  }

  addMoney(nomor: string, amount: number): BotUser | null {
    this.db.prepare(`
      INSERT INTO users (nomor, money)
      VALUES (?, ?)
      ON CONFLICT(nomor) DO UPDATE SET money = users.money + excluded.money
    `).run(nomor, amount);
    return this.getByPhone(nomor);
  }

  close(): void {
    this.db.close();
  }
}

export const userDatabase = new UserDatabase();
