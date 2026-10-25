import makeWASocket, { type WAMessage, type WASocket } from "@whiskeysockets/baileys";
import adminCommand from "../../cmds/admin.js";
import cCommand from "../../cmds/c.js";
import helpCommand from "../../cmds/help.js";
import pingCommand from "../../cmds/ping.js";
import { loadBotConfig, normalizePhone } from "./bot-config";
import { userDatabase } from "./database";
import type { CommandContext, CommandModule } from "./command-types";

const config = loadBotConfig();
const commands: CommandModule[] = [pingCommand, helpCommand, cCommand, adminCommand];
const cooldowns = new Map<string, number>();

export function listCommands(): CommandModule[] {
  return commands;
}

function phoneFromJid(jid: string | undefined): string | null {
  if (!jid || !jid.endsWith("@s.whatsapp.net")) return null;
  return normalizePhone(jid.split("@")[0]?.split(":")[0]);
}

function senderPhoneFromMessage(message: WAMessage): string | null {
  const key = message.key as typeof message.key & {
    remoteJidAlt?: string;
    participantAlt?: string;
    participantPn?: string;
  };
  const candidates = [
    key.participantPn,
    key.participantAlt,
    key.remoteJidAlt,
    key.participant,
    key.remoteJid
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const phone = phoneFromJid(candidate);
    if (phone) return phone;
  }
  return null;
}

function messageText(message: WAMessage): string {
  const content = message.message;
  return (
    content?.conversation ??
    content?.extendedTextMessage?.text ??
    content?.imageMessage?.caption ??
    content?.videoMessage?.caption ??
    content?.documentMessage?.caption ??
    ""
  ).trim();
}

async function getGroupRole(
  socket: WASocket,
  chatJid: string,
  senderPhone: string
): Promise<number> {
  if (!chatJid.endsWith("@g.us")) return 0;
  try {
    const metadata = await socket.groupMetadata(chatJid);
    const participants = metadata.participants as Array<{
      id?: string;
      phoneNumber?: string;
      lid?: string;
      admin?: string | null;
    }>;
    const sender = participants.find((participant) => {
      const participantPhone =
        normalizePhone(participant.phoneNumber) ??
        phoneFromJid(participant.id) ??
        phoneFromJid(participant.lid);
      return participantPhone === senderPhone;
    });
    if (sender?.admin === "superadmin") return 2;
    return sender?.admin === "admin" ? 1 : 0;
  } catch {
    return 0;
  }
}

function roleFor(senderPhone: string, groupRole: number): number {
  if (config.adminNum.includes(senderPhone)) return 4;
  if (config.moderatorNum.includes(senderPhone)) return 3;
  return groupRole;
}

async function reply(
  socket: WASocket,
  message: WAMessage,
  text: string
): Promise<void> {
  const chatJid = message.key.remoteJid;
  if (!chatJid || !text) return;
  await socket.sendMessage(chatJid, { text }, { quoted: message });
}

export async function handleWhatsAppMessage(
  socket: WASocket,
  message: WAMessage
): Promise<void> {
  const senderPhone = senderPhoneFromMessage(message);
  if (!senderPhone) return; // Never store or process LID-only identifiers.

  const body = messageText(message);
  if (!body.startsWith(config.prefix)) return;

  const [rawName = "", ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = rawName.toLowerCase();
  const command = commands.find((item) => item.config.name === commandName);
  if (!command) return;

  const user = userDatabase.getOrCreate(senderPhone, message.pushName ?? "unknown");
  if (user.status === "banned") return;

  const chatJid = message.key.remoteJid;
  if (!chatJid) return;
  const groupRole = await getGroupRole(socket, chatJid, senderPhone);
  const role = roleFor(senderPhone, groupRole);

  if (role < command.config.role) {
    await reply(socket, message, "Maaf, role Anda belum memiliki izin untuk command ini.");
    return;
  }

  const now = Date.now();
  const cooldownKey = `${senderPhone}:${commandName}`;
  const expiresAt = cooldowns.get(cooldownKey) ?? 0;
  if (role === 0 && expiresAt > now) {
    const seconds = Math.ceil((expiresAt - now) / 1000);
    await reply(socket, message, `Tunggu ${seconds} detik sebelum memakai /${commandName} lagi.`);
    return;
  }

  if (role === 0 && command.config.cooldown > 0) {
    cooldowns.set(cooldownKey, now + command.config.cooldown * 1000);
  }

  const context: CommandContext = {
    args,
    commands,
    normalizePhone,
    role,
    senderPhone,
    adminNumbers: config.adminNum,
    store: userDatabase,
    user
  };
  const result = await command.run(context);
  if (result) await reply(socket, message, result);
}

export function getBotPrefix(): string {
  return config.prefix;
}
