import type { UserDatabase } from "./database";

export interface CommandConfig {
  name: string;
  cooldown: number;
  description: string;
  role: number;
  usage: string;
}

export interface CommandModule {
  config: CommandConfig;
  run(context: CommandContext): Promise<string | void> | string | void;
}

export interface CommandContext {
  args: string[];
  commands: CommandModule[];
  normalizePhone(value: unknown): string | null;
  role: number;
  senderPhone: string;
  adminNumbers: string[];
  store: UserDatabase;
  user: {
    id: number;
    name: string;
    nomor: string;
    status: "banned" | "unbanned";
    bannedReason: string;
    money: number;
  };
}
