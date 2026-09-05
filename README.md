# 💸 Split‑Expense

Split bills with friends, groups, and roommates — track who paid, who owes
what, and settle up. Frontend is **Next.js**, backend is **Node/Express +
MongoDB**.

> ⭐ New here? This guide is written for beginners — just follow the steps in
> order and you'll have it running locally.
>
> **Like this project?** [Give it a star](https://github.com/Gautam5514/Split-Expense) — it helps others find it!

---

## 🛠️ Tech Stack

**Frontend**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-8884d8?style=flat-square)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)

**Database, Auth & Storage**

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-22B573?style=flat-square&logo=nodemailer&logoColor=white)

**AI & OCR**

![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Tesseract.js](https://img.shields.io/badge/Tesseract.js-EE4C2C?style=flat-square)

**Testing**

![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white)

---

## ✨ What it does

- 👥 Create groups, add friends, split bills
- 🧾 Track expenses and see who owes what
- 🔔 Real-time updates + push notifications
- 🤖 AI helpers for receipts
- 🔐 Login/signup with secure auth

---

## 🗂️ Project layout

```
Split/
├── backend/    # Express API + MongoDB (runs on :5000)
└── frontend/   # Next.js app (runs on :3000)
```

---

## 🚀 Run it locally (step by step)

**You need:** [Node.js](https://nodejs.org) 18+, and a MongoDB connection
string (get a free one at [MongoDB Atlas](https://www.mongodb.com/atlas)).

### 1. Get the code
```bash
git clone https://github.com/Gautam5514/Split-Expense.git
cd Split-Expense
```

### 2. Start the backend
```bash
cd backend
npm install
cp .env.example .env      # open .env and fill in your values
npm run dev                # → http://localhost:5000
```

### 3. Start the frontend (open a **new** terminal)
```bash
cd frontend
npm install
cp .env.example .env.local   # open .env.local and fill in your values
npm run dev                   # → http://localhost:3000
```

### 4. Open the app
Go to **http://localhost:3000** in your browser. That's it! 🎉

> 🔒 **Never commit `.env` / `.env.local`.** They hold secrets and are
> already git-ignored — the `.env.example` files are just templates to copy.

**Only need MongoDB + auth working?** You can leave the Firebase, Cloudinary,
SMTP, and AI keys blank for now — those only matter if you're touching push
notifications, image uploads, emails, or AI features.

---

## 🧪 Running tests

```bash
cd backend && npm test     # backend tests
cd frontend && npm test    # frontend tests
```

---

## 🤝 Contributing

New to open source? You're welcome here — code, docs, bug reports, and ideas
all count as contributions.

👉 **Full step-by-step guide:** [CONTRIBUTING.md](CONTRIBUTING.md)
(explains forking, branches, and pull requests in plain language)

Quick version:
1. **Fork** this repo (button top-right on GitHub)
2. **Clone** your fork, then create a branch: `git checkout -b feat/my-change`
3. Make your changes and **commit** them
4. **Push** to your fork and **open a Pull Request**

Look for issues labeled [`good first issue`](https://github.com/Gautam5514/Split-Expense/issues) to get started.

---

## ⭐ Support the project

If Split-Expense helped you, please **[star the repo](https://github.com/Gautam5514/Split-Expense)** — it's the easiest way to say thanks. ❤️
