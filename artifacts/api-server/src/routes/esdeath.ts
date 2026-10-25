import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  ConnectEsdeathBotResponse,
  GetEsdeathDashboardResponse,
  GetEsdeathSessionResponse,
  ListEsdeathCommandsResponse,
  ListEsdeathUsersResponse,
  LoginEsdeathBody,
  LoginEsdeathResponse,
  LogoutEsdeathResponse
} from "@workspace/api-zod";
import { baileysManager } from "../lib/baileys-manager";
import {
  checkLoginRate,
  dashboardSessionTtlMs,
  isAuthenticated,
  login,
  logout
} from "../lib/dashboard-auth";
import { userDatabase } from "../lib/database";
import { listCommands } from "../lib/command-handler";

const router: IRouter = Router();
const cookieName = "esdeath_session";
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/esdeath"
};

function sessionToken(req: Request): string | undefined {
  const token = req.cookies?.[cookieName];
  return typeof token === "string" ? token : undefined;
}

function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "private, no-store");
  if (!isAuthenticated(sessionToken(req))) {
    res.status(401).json({ error: "Login dashboard diperlukan." });
    return;
  }
  next();
}

function dashboardPayload() {
  const bot = baileysManager.snapshot();
  const stats = userDatabase.getStats();
  return GetEsdeathDashboardResponse.parse({
    botName: "Esdeath",
    adminName: "Luxion Skye/Demian",
    status: bot.status,
    phoneNumber: bot.phoneNumber,
    uptimeSeconds: bot.uptimeSeconds,
    qrCodeDataUrl: bot.qrCodeDataUrl,
    totalUsers: stats.totalUsers,
    bannedUsers: stats.bannedUsers,
    totalCommands: listCommands().length,
    lastError: bot.lastError
  });
}

router.get("/esdeath/auth/session", (req, res): void => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json(GetEsdeathSessionResponse.parse({
    authenticated: isAuthenticated(sessionToken(req))
  }));
});

router.post("/esdeath/auth/login", (req, res): void => {
  res.setHeader("Cache-Control", "private, no-store");
  const parsed = LoginEsdeathBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Masukkan kata sandi dashboard." });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkLoginRate(ip)) {
    res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi satu menit kemudian." });
    return;
  }

  const token = login(parsed.data.password);
  if (!token) {
    res.status(401).json({ error: "Kata sandi tidak sesuai." });
    return;
  }

  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: dashboardSessionTtlMs
  });
  res.json(LoginEsdeathResponse.parse({ authenticated: true }));
});

router.post("/esdeath/auth/logout", (req, res): void => {
  logout(sessionToken(req));
  res.clearCookie(cookieName, cookieOptions);
  res.json(LogoutEsdeathResponse.parse({ authenticated: false }));
});

router.use("/esdeath", requireDashboardAuth);

router.get("/esdeath/dashboard", (_req, res): void => {
  res.json(dashboardPayload());
});

router.post("/esdeath/bot/connect", async (_req, res): Promise<void> => {
  await baileysManager.start();
  res.json(ConnectEsdeathBotResponse.parse(dashboardPayload()));
});

router.get("/esdeath/users", (_req, res): void => {
  res.json(ListEsdeathUsersResponse.parse(userDatabase.listUsers()));
});

router.get("/esdeath/commands", (_req, res): void => {
  res.json(ListEsdeathCommandsResponse.parse(
    listCommands().map((command) => command.config)
  ));
});

export default router;
