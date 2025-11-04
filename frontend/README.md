# Frontend — Split (Next.js)

This folder contains the Next.js frontend for the Split expense-sharing app.

This README covers everything you need to run and develop the frontend locally on Windows PowerShell, including environment variables, how the app talks to the backend, Firebase setup, build and deploy notes, and troubleshooting tips.

## Table of contents

- Project summary
- Tech stack
- Prerequisites
- Environment variables
- Quick start (PowerShell)
- Important files & structure
- Firebase client
- Auth & API usage
- Styling
- Build & production
- Common issues & troubleshooting
- Next steps

## Project summary

The frontend is a Next.js application using the app router. It provides UI for authentication, group management, adding expenses, uploading attachments, notifications and profile management. The UI uses React contexts to provide authentication and notification state across the app.

## Tech stack

- Next.js (React)
- Tailwind CSS
- Firebase (client SDK for optional features such as messaging or auth helper)
- Fetch/axios (requests to backend via `lib/api.js`)

## Prerequisites

Install Node.js (LTS recommended) and npm. Verify in PowerShell:

```powershell
node -v
npm -v
```

You also need a running backend API (see root `backend/` folder) and optional Firebase & Cloudinary accounts for messaging and uploads.

## Environment variables

Create a `.env.local` in `frontend/` (this file should not be committed). Keys used by this project typically include:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Firebase client values (if using Firebase features in the client)
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
```

Notes:
- `NEXT_PUBLIC_API_URL` should point to your backend API base URL. If you run the backend on a different port or host, update this accordingly.
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser by Next.js — don't put secrets here.

## Quick start (PowerShell)

1. Open PowerShell and go to the frontend folder:

```powershell
cd f:\MERN_APPLICATION\split\frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Create `.env.local` with the variables shown above.

4. Start development server:

```powershell
npm run dev
```

5. Open http://localhost:3000 in your browser.

Other useful scripts (check `package.json` in `frontend/`):

```powershell
npm run build    # build for production
npm run start    # run production build locally (after build)
npm run lint     # run linter (if configured)
```

## Important files & structure

- `app/` — Next.js app routes and pages (app router). Main pages live here (dashboard, groups, auth, profile).
- `components/` — Reusable UI components (Navbar, MemberPicker, AddExpenseModal).
- `context/` — `AuthContext.jsx` and `NotificationContext.jsx` provide global state for authentication and notifications.
- `lib/api.js` — Central place for API requests; configure base URL here or rely on `NEXT_PUBLIC_API_URL`.
- `lib/firebaseClient.js` — Firebase client initialization used by the client (if enabled).
- `public/` — Static assets.

If you need to change how the frontend talks to the backend, start in `lib/api.js`.

## Firebase client

`lib/firebaseClient.js` initializes the Firebase client SDK with values from environment variables. If you plan to use Firebase features (e.g., messaging, analytics), ensure you add the `NEXT_PUBLIC_FIREBASE_*` variables to `.env.local`.

Common pitfalls:
- If the Firebase config in `.env.local` is incorrect, the Firebase SDK will log errors to the browser console.
- Remember the Firebase client config is safe to be public (it's okay as long as server secrets are not stored there).

## Auth & API usage

Auth state and token management lives in `context/AuthContext.jsx`. Typical flow:

- After login/register, the backend returns a JWT token.
- `AuthContext` stores the token (in memory or localStorage depending on implementation) and sets an Authorization header for subsequent API requests.
- Secure routes on the frontend check auth state before rendering.

If you see 401/403 when calling the API:

- Confirm `NEXT_PUBLIC_API_URL` points at the running backend.
- Inspect `lib/api.js` to see how the Authorization header is added.
- Ensure the backend `JWT_SECRET` matches the secret used to sign tokens (backend `.env`).

## Styling

Tailwind CSS is used for styles. If you change Tailwind config, restart the dev server for changes to apply.

## Build & production

To create a production build:

```powershell
cd f:\MERN_APPLICATION\split\frontend
npm run build
npm run start
```

`npm run start` runs the compiled Next.js server. If you want to host statically (only if app is static-exportable), consider `next export` and serve the `out/` folder via static host.

Deploying to Vercel or similar providers is common for Next.js apps. Set the environment variables in the provider dashboard and deploy from your repository.

## Common issues & troubleshooting

- CORS / API unreachable
  - Symptoms: Fetch fails, requests blocked by CORS, or 404/502.
  - Fix: Ensure `NEXT_PUBLIC_API_URL` is correct and your backend server has CORS enabled (or use a proxy in development). For local dev with backend on port 5000, keep API URL `http://localhost:5000/api`.

- Auth token not present or invalid
  - Symptoms: 401 responses from API that work in Postman.
  - Fix: Ensure `AuthContext` is storing the token and `lib/api.js` attaches it. Also confirm token expiration and backend `JWT_SECRET`.

- Firebase warnings/errors in console
  - Fix: Re-check values in `.env.local` and ensure `lib/firebaseClient.js` reads them correctly.

- Images not uploading or previewing
  - Fix: Confirm the upload endpoint on backend is reachable, check Cloudinary config on backend, and make sure the frontend sends the file correctly (FormData) to the upload route.

## Debugging tips

- Use the browser DevTools Network tab to inspect requests and headers.
- Test backend endpoints with Postman/Insomnia to isolate frontend vs backend issues.
- If environment variables change, restart the Next.js dev server.

## Next steps / recommended improvements

- Add a `.env.example` file in `frontend/` with the variable keys (no values) to make onboarding easier.
- Add tests for critical components using React Testing Library.
- Add a single `dev` script at the workspace root using `concurrently` to run frontend + backend.
- Add a `Dockerfile` and a `docker-compose.yml` to make local setup reproducible.

## Useful PowerShell commands

```powershell
# Install dependencies
cd f:\MERN_APPLICATION\split\frontend
npm install

# Develop
npm run dev

# Build & run (production)
npm run build
npm run start
```

---

If you'd like, I can now:

1. Add `frontend/.env.example` with the keys listed above.
2. Add a dev convenience script at the repository root to run both frontend and backend concurrently.
3. Create a `docker-compose.yml` for local dev (Mongo + backend + frontend).

Tell me which help you want next and I'll implement it and update the todo list.
