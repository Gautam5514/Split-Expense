# SplitEase Web

The Next.js web app for SplitEase. Overview, architecture and full setup live in the
[root README](../README.md).

> This project uses a newer Next.js than most tutorials assume. Read [`AGENTS.md`](AGENTS.md)
> and the guides in `node_modules/next/dist/docs/` before changing routing or config.

## Run

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your API
npm run dev                  # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` · `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm test` | Jest + Testing Library |

## Where things are

| Path | Contents |
|---|---|
| `app/` | Routes (dashboard, groups, settings, admin, marketing pages) |
| `components/autopilot/` | Autopilot widget, plan cards, approval and edit flow |
| `components/` | Navbars, notification bell, group and expense UI |
| `context/` | Auth and notifications (Socket.IO + web push) |
| `lib/` | API client, Firebase messaging, presets |
| `public/notifications/` | 1024×512 banner art used in tip push notifications |
| `public/firebase-messaging-sw.js` | Web push service worker |

## Feature flags

`NEXT_PUBLIC_AUTOPILOT_ENABLED=true` shows the Autopilot launcher. It is read at **build time**, so
rebuild after changing it. The API must also have `AUTOPILOT_ENABLED=true`.
