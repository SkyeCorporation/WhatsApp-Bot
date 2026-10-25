# Esdeath WhatsApp Bot

Esdeath is a Baileys-powered WhatsApp bot with a password-gated web dashboard and a local SQLite user database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API and WhatsApp bot service
- `pnpm --filter @workspace/esdeath-bot run dev` — run the dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Bot settings: `artifacts/api-server/config.json` (`prefix`, `adminNum`, `moderatorNum`)
- SQLite database and Baileys session: `artifacts/api-server/data/` (ignored by Git and deployment)
- Node.js 22 is required for the bot service.

## Stack

- pnpm workspaces, Node.js 22, TypeScript 5.9
- Dashboard: React + Vite
- API: Express 5 + Baileys
- Bot data: SQLite + better-sqlite3
- API validation: Zod schemas generated from OpenAPI
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/esdeath-bot/` — login screen and operations dashboard
- `artifacts/api-server/src/lib/baileys-manager.ts` — WhatsApp connection, QR, and uptime state
- `artifacts/api-server/src/lib/database.ts` — SQLite schema and user records
- `artifacts/api-server/cmds/` — `ping`, `help`, `admin`, and `c` commands
- `artifacts/api-server/config.json` — command prefix and bot admin/moderator phone numbers
- `lib/api-spec/openapi.yaml` — source of truth for dashboard API contracts

## Architecture decisions

- One SQLite file stores one row per normalized WhatsApp phone number.
- Baileys session files stay in the ignored local data directory and are not committed.
- QR access and dashboard data require a server-issued, HTTP-only session cookie.
- The dashboard password is the fixed value requested for this prototype; change the auth approach before making the dashboard public.

## Product

The dashboard displays the login QR, connection state, phone number, uptime, user records, and command metadata. Bot roles are: all users (0), group admin (1), group admin level 2 (2), bot moderator (3), and bot admin (4). Bot moderators and admins skip cooldowns.

## User preferences

- Keep WhatsApp chat content out of server logs; any chat notification should identify only the bot's phone number, never a LID.

## Gotchas

- Add phone numbers as digits with country code in `config.json`; blank entries are ignored.
- Do not commit `artifacts/api-server/data/`; it contains the SQLite database and linked WhatsApp session.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
