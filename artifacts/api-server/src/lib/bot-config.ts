import { readFileSync } from "node:fs";
import path from "node:path";

export interface BotConfig {
  prefix: string;
  adminNum: string[];
  moderatorNum: string[];
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function readPhoneList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`config.json: ${field} must be an array of phone numbers`);
  }
  return [...new Set(value.map(normalizePhone).filter((phone): phone is string => phone !== null))];
}

export function loadBotConfig(): BotConfig {
  const configPath = path.resolve(process.cwd(), "config.json");
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  if (typeof raw.prefix !== "string" || raw.prefix.length === 0 || raw.prefix.length > 4) {
    throw new Error("config.json: prefix must be a non-empty string up to 4 characters");
  }

  return {
    prefix: raw.prefix,
    adminNum: readPhoneList(raw.adminNum, "adminNum"),
    moderatorNum: readPhoneList(raw.moderatorNum, "moderatorNum")
  };
}
