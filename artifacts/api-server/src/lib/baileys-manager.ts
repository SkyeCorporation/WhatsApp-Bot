import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket
} from "@whiskeysockets/baileys";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import pino from "pino";
import { logger } from "./logger";
import { handleWhatsAppMessage } from "./command-handler";

export type BotStatus = "connecting" | "qr" | "connected" | "disconnected" | "error";

export interface BotSnapshot {
  status: BotStatus;
  phoneNumber: string | null;
  uptimeSeconds: number;
  qrCodeDataUrl: string | null;
  lastError: string | null;
}

const authDirectory = path.resolve(
  process.env.ESDEATH_DATA_DIR ?? path.join(process.cwd(), "data"),
  "auth"
);

function phoneFromJid(jid: string | undefined): string | null {
  if (!jid || !jid.endsWith("@s.whatsapp.net")) return null;
  const digits = jid.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");
  return digits && digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function disconnectCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const output = "output" in error ? error.output : undefined;
  if (typeof output !== "object" || output === null || !("statusCode" in output)) {
    return undefined;
  }
  return typeof output.statusCode === "number" ? output.statusCode : undefined;
}

class BaileysManager {
  private socket: WASocket | null = null;
  private status: BotStatus = "connecting";
  private connectedAt: number | null = null;
  private phoneNumber: string | null = null;
  private qrCodeDataUrl: string | null = null;
  private lastError: string | null = null;
  private startPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private generation = 0;

  snapshot(): BotSnapshot {
    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      uptimeSeconds: this.connectedAt
        ? Math.max(0, Math.floor((Date.now() - this.connectedAt) / 1000))
        : 0,
      qrCodeDataUrl: this.qrCodeDataUrl,
      lastError: this.lastError
    };
  }

  start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    if (this.socket && (this.status === "connected" || this.status === "qr" || this.status === "connecting")) {
      return Promise.resolve();
    }
    this.startPromise = this.connect().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  async stop(): Promise<void> {
    this.generation += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    this.status = "disconnected";
    this.connectedAt = null;
    this.qrCodeDataUrl = null;
    if (socket) {
      socket.end(undefined);
    }
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    this.status = "connecting";
    this.lastError = null;
    try {
      await fs.mkdir(authDirectory, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" })
      });
      this.socket = socket;
      socket.ev.on("creds.update", saveCreds);
      socket.ev.on("connection.update", (update) => {
        void this.onConnectionUpdate(update, socket, generation);
      });
      socket.ev.on("messages.upsert", ({ messages, type }) => {
        for (const message of messages) {
          if (message.key.fromMe) {
            const botPhone = phoneFromJid(socket.user?.id);
            if (botPhone) logger.info({ phoneNumber: botPhone }, "Message sent by Esdeath");
            continue;
          }
          if (type === "notify") {
            void handleWhatsAppMessage(socket, message).catch(() => {
              logger.warn("Command handling failed");
            });
          }
        }
      });
    } catch (error) {
      if (generation !== this.generation) return;
      this.status = "error";
      this.lastError = "Koneksi bot gagal dimulai. Coba sambungkan ulang.";
      logger.error("Failed to start the WhatsApp bot");
      this.scheduleReconnect(generation);
    }
  }

  private async onConnectionUpdate(
    update: { connection?: string; qr?: string; lastDisconnect?: { error?: unknown } },
    socket: WASocket,
    generation: number
  ): Promise<void> {
    if (generation !== this.generation) return;

    if (update.qr) {
      try {
        this.qrCodeDataUrl = await QRCode.toDataURL(update.qr, {
          width: 280,
          margin: 2,
          color: { dark: "#101D33", light: "#FFFFFF" }
        });
        this.status = "qr";
        this.phoneNumber = null;
        this.lastError = null;
      } catch (error) {
        this.status = "error";
        this.lastError = "QR login gagal dibuat.";
        logger.error("Failed to create the WhatsApp QR code");
      }
    }

    if (update.connection === "open") {
      this.status = "connected";
      this.connectedAt = Date.now();
      this.qrCodeDataUrl = null;
      this.phoneNumber = phoneFromJid(socket.user?.id);
      this.lastError = null;
      this.reconnectAttempt = 0;
      logger.info(
        { phoneNumber: this.phoneNumber ?? "unavailable" },
        "Esdeath WhatsApp connection opened"
      );
      return;
    }

    if (update.connection === "close") {
      const code = disconnectCode(update.lastDisconnect?.error);
      this.socket = null;
      this.connectedAt = null;
      this.phoneNumber = null;
      this.qrCodeDataUrl = null;
      if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
        this.status = "disconnected";
        this.lastError = "Sesi WhatsApp berakhir. Sambungkan ulang untuk menampilkan QR baru.";
        await fs.rm(authDirectory, { recursive: true, force: true });
        logger.warn("WhatsApp session ended; saved login state was cleared");
        return;
      }
      this.status = "connecting";
      this.lastError = null;
      this.scheduleReconnect(generation);
    }
  }

  private scheduleReconnect(generation: number): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (generation === this.generation) void this.start();
    }, delay);
    this.reconnectTimer.unref();
  }
}

export const baileysManager = new BaileysManager();
