# Split — MERN Expense Sharing App

This repository contains a full-stack MERN (MongoDB, Express, React/Next.js, Node) application for tracking shared expenses, groups, balances, notifications, and uploads. It’s split into two top-level folders: `backend/` and `frontend/`.

This README gives full, step-by-step instructions to get the project running locally (Windows PowerShell), explains environment variables, summarizes the API surface, and lists troubleshooting tips and next steps.

## Table of contents

- Project overview
- Tech stack
- Prerequisites
- Folder structure
- Environment variables
- Backend: install & run
- Frontend: install & run
- API overview (routes)
- File upload & media (Cloudinary)
- Notifications (Firebase Admin)
- Troubleshooting
- Contributing
- License

## Project overview

`Split` is a simple expense-splitting / group expense tracking app. Users can create groups, add expenses, upload attachments, and see balances between members. The backend exposes a REST API and integrates with Cloudinary for uploads and Firebase Admin for push/notification tasks. The frontend is built with Next.js (app router) and uses a React context for auth and notifications.

## Tech stack

- Backend: Node.js, Express, MongoDB (Mongoose)
- Frontend: Next.js, React, Tailwind CSS
- Authentication: JWT-based (backend)
- File uploads: Cloudinary
- Notifications: Firebase Admin SDK

## Prerequisites

Make sure you have these installed on your Windows machine:

- Node.js (LTS recommended; e.g., 16/18/20). Verify with:

```powershell
node -v
npm -v
```
- MongoDB instance (local or hosted like MongoDB Atlas)
- (Optional) Cloudinary account for image uploads
- (Optional) Firebase service account JSON for notifications

## Folder structure (summary)

- `backend/` — Express API, models, controllers, routes, config
- `frontend/` — Next.js app (app/), components, contexts, lib

Detailed contents inside each folder are present in the repository root; see the `backend/config` and `frontend/lib` files for cloud & Firebase clients.

## Environment variables

Create environment files in each folder as described below. Do NOT commit secrets to source control.

Backend `.env` (example keys)

```
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<strong-secret>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/firebase-service-account.json
CLIENT_URL=http://localhost:3000
```

Notes:
- `FIREBASE_SERVICE_ACCOUNT_PATH` can be a path to the downloaded JSON file used by Firebase Admin or you can pass the JSON contents via another environment variable if your config supports it.

Frontend `.env.local` (example keys — Next.js public prefix for browser-safe vars)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase_auth_domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase_project_id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase_storage_bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messaging_sender_id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app_id>
```

Adjust names above to match the keys used in `frontend/lib/firebaseClient.js`.

## Backend — install & run (PowerShell)

1. Open PowerShell and navigate to the backend folder:

```powershell
cd f:\MERN_APPLICATION\split\backend
```

2. Install dependencies:

```powershell
npm install
```

3. Ensure your `.env` file is configured (see Environment variables). Make sure MongoDB is reachable.

4. Start the server (common options):

```powershell
# For production start
npm start

# For development (if a `dev` script exists, or use nodemon)
npm run dev

# Or directly (if index.js is the entrypoint)
node index.js
```

5. The backend typically runs on the `PORT` in `.env` (commonly 5000). Verify in the server logs.

## Frontend — install & run (PowerShell)

1. Open PowerShell and navigate to the frontend folder:

```powershell
cd f:\MERN_APPLICATION\split\frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Create `.env.local` or set environment variables (see Environment variables section).

4. Run the Next.js development server:

```powershell
npm run dev
```

5. The Next app typically runs on http://localhost:3000. Open that in your browser.

## API overview (routes)

The backend includes routes grouped by resource. Base route prefix used in the frontend is commonly `/api`.

Typical endpoints (adjust if your `index.js` mounts differently):

- Auth: POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout` etc.
- Users: `/api/users` (GET/PUT/DELETE)
- User Profile: `/api/user-profile` (profile read/update)
- Groups: `/api/groups` (create, join, list, get by id)
- Expenses: `/api/expenses` (create, list, update, delete)
- Balance: `/api/balance` (calculate or list balances)
- Notifications: `/api/notifications` (list, mark-read)
- Uploads: `/api/upload` (multipart or base64 uploads handled by Cloudinary)

Consult the route files in `backend/routes/` for exact endpoint names, required parameters and auth requirements.

### Example request (PowerShell / curl)

```powershell
# Get groups (assuming JWT auth via Authorization header)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/groups
```

## File uploads (Cloudinary)

Uploads are handled by Cloudinary SDK configured in `backend/config/cloudinary.js`. To enable uploads:

1. Create a Cloudinary account and get cloud name, API key and secret.
2. Add the values to your backend `.env` as shown earlier.
3. The upload route (e.g., `/api/upload`) will return the Cloudinary URL for the uploaded file.

## Notifications (Firebase Admin)

The backend includes Firebase Admin integration for sending notifications and other privileged operations. To enable:

1. Create a Firebase service account JSON from your Firebase console.
2. Place it somewhere on the backend (not committed to git) and set `FIREBASE_SERVICE_ACCOUNT_PATH` or other credentials in `.env`.
3. Verify `backend/config/firebaseAdmin.js` reads the key properly.

## Database seeding (optional)

If you want test data, add a `seed` script or create a small script to insert users/groups/expenses into your MongoDB. Keep seed data out of production environments.

## Tests and linting

This project may or may not include tests. If present, run them from the folder that contains the `package.json` with test scripts:

```powershell
npm test
```

Check `package.json` in each folder for `lint`, `test`, and `build` scripts.

## Troubleshooting

- Error: "MongoNetworkError" or cannot connect to MongoDB — check `MONGO_URI`, network/firewall, and whether Atlas IP whitelist allows your IP.
- JWT auth failed — ensure `JWT_SECRET` matches the expected value and tokens are being sent in the `Authorization` header like `Bearer <token>`.
- Cloudinary upload errors — confirm keys, and check whether upload payload is in expected format (`multipart/form-data` or base64).
- Firebase Admin permission errors — verify the service account JSON has the right permissions and the path is correct.
- Frontend CORS or proxy issues — if the frontend attempts to call the backend and receives CORS errors, either enable CORS on the backend or ensure the frontend proxies requests correctly. Also confirm `NEXT_PUBLIC_API_URL` points to the backend.

If you see a runtime error, check the server logs and the console in the browser. Share the relevant stack trace when asking for help.

## Development notes & tips

- Use Postman or Insomnia for manual API testing.
- Keep your `.env` files out of version control and use `.gitignore` to prevent accidental commits.
- Add `nodemon` to `devDependencies` and a `dev` script in `backend/package.json` for auto-reload while developing.
- Consider adding `concurrently` or `pnpm` workspace to start backend + frontend with a single command.

## Quick start checklist

1. Clone the repo.
2. Create `backend/.env` and `frontend/.env.local` from the templates above.
3. Install dependencies in both `backend` and `frontend`.
4. Start MongoDB (or ensure Atlas is reachable).
5. Start backend: `npm run dev` (or `npm start`).
6. Start frontend: `npm run dev`.
7. Open `http://localhost:3000` and sign up / log in.

## Contributing

Contributions are welcome. Suggested steps:

1. Open an issue to discuss large changes.
2. Create a feature branch and open a pull request.
3. Run existing tests and add tests for new features.

## Next steps & improvements

- Add CI (GitHub Actions) to run tests and lint on PRs.
- Add Docker / docker-compose for local dev (Mongo + backend + frontend).
- Add end-to-end tests (Cypress) covering flows like sign-up, create group, add expense.

## License

Specify your license here, for example MIT. Replace this section with your actual license and SPDX identifier.

---

If you'd like, I can also:

- Add sample `.env.example` files to `backend/` and `frontend/` with the keys described above.
- Add a `dev` script that runs backend and frontend concurrently.
- Create a Docker Compose file for local development.

Tell me which of those you'd like next and I’ll implement it.
