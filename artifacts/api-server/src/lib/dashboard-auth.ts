import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PASSWORD = "#Luxion123";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(token);
  }
  for (const [ip, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(ip);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

function passwordMatches(candidate: string): boolean {
  const expected = createHash("sha256").update(PASSWORD).digest();
  const actual = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, actual);
}

export function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

export function login(password: string): string | null {
  if (!passwordMatches(password)) return null;
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function logout(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export const dashboardSessionTtlMs = SESSION_TTL_MS;
