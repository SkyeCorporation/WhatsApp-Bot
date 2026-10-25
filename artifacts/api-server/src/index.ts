import app from "./app";
import { logger } from "./lib/logger";
import { baileysManager } from "./lib/baileys-manager";
import { userDatabase } from "./lib/database";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
  void baileysManager.start();
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down Esdeath services");
  await baileysManager.stop();
  userDatabase.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
