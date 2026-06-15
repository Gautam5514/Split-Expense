/**
 * Single source of truth for the SplitEase architecture mind map.
 * Adding a page = adding one entry to a branch's `pages` array. Nothing else.
 *
 * @typedef {Object} PageNode
 * @property {string}  id          Unique, stable id.
 * @property {string}  label       Display label.
 * @property {string}  route       App route to navigate to / open.
 * @property {string}  description One-line summary (tooltip + aria).
 * @property {boolean} [live]      True if the route resolves in this app today.
 *
 * @typedef {Object} Branch
 * @property {string}     id
 * @property {string}     label
 * @property {string}     color   Hex color that themes the branch + its pages.
 * @property {PageNode[]} pages
 *
 * @typedef {Object} CoreNode
 * @property {string} id
 * @property {string} label
 * @property {string} description
 *
 * @typedef {Object} AppMap
 * @property {CoreNode} core
 * @property {Branch[]} branches
 */

/** @type {AppMap} */
export const APP_MAP = {
  core: {
    id: "core",
    label: "SplitEase Core",
    description:
      "App shell: routing, auth guard, global navigation, theme, and currency context.",
  },
  branches: [
    {
      id: "auth",
      label: "Authentication",
      color: "#f43f5e",
      pages: [
        {
          id: "onboarding",
          label: "Onboarding",
          route: "/how-it-works",
          description:
            "First-run intro carousel, value prop, get started, permission requests.",
          live: true,
        },
        {
          id: "login",
          label: "Login",
          route: "/login",
          description:
            "Email + password, Google/Apple OAuth, biometric unlock, remember me.",
          live: true,
        },
        {
          id: "register",
          label: "Register",
          route: "/register",
          description:
            "Name, email, phone, password, default currency, OTP/email verification.",
          live: true,
        },
        {
          id: "reset-password",
          label: "Reset Password",
          route: "/reset-password",
          description: "Request reset, enter OTP, set new password, success state.",
          live: true,
        },
      ],
    },
    {
      id: "splits",
      label: "Dashboard & Splits",
      color: "#22c55e",
      pages: [
        {
          id: "home-overview",
          label: "Home Overview",
          route: "/dashboard",
          description:
            "Net balance, monthly spend, quick actions, recent activity.",
          live: true,
        },
        {
          id: "add-expense",
          label: "Add Expense",
          route: "/dashboard",
          description:
            "Amount, payer, participants, split type, category, date, notes, receipt.",
          live: true,
        },
        {
          id: "expense-detail",
          label: "Expense Detail",
          route: "/expenses",
          description:
            "Per-person breakdown, edit/delete, comments thread, edit history.",
          live: false,
        },
        {
          id: "settle-up",
          label: "Settle Up",
          route: "/settle",
          description:
            "Compute who-owes-whom, choose amount + method, mark settled.",
          live: false,
        },
        {
          id: "activity-feed",
          label: "Activity Feed",
          route: "/users",
          description:
            "Chronological log of expenses, settlements, and edits across everything.",
          live: true,
        },
      ],
    },
    {
      id: "groups",
      label: "Groups & Ledger",
      color: "#14b8a6",
      pages: [
        {
          id: "groups-list",
          label: "Groups List",
          route: "/groups",
          description: "All groups with balance badges, search/filter, create button.",
          live: false,
        },
        {
          id: "create-group",
          label: "Create Group",
          route: "/groups/create",
          description: "Name, type, default currency, add members.",
          live: false,
        },
        {
          id: "group-detail",
          label: "Group Detail",
          route: "/groups/demo",
          description:
            "Tabs: Expenses / Balances / Members; running ledger; add expense in group.",
          live: true,
        },
        {
          id: "group-settings",
          label: "Group Settings",
          route: "/settings",
          description:
            "Add/remove members, rename, simplify-debts toggle, archive/delete, leave.",
          live: true,
        },
        {
          id: "invite-members",
          label: "Invite Members",
          route: "/invite/demo",
          description: "Share link, QR code, pick from contacts, pending invites.",
          live: true,
        },
      ],
    },
    {
      id: "social",
      label: "Social & Messaging",
      color: "#06b6d4",
      pages: [
        {
          id: "friends",
          label: "Friends",
          route: "/users",
          description:
            "Friend list with balances, add friend, incoming/outgoing requests.",
          live: true,
        },
        {
          id: "chats-list",
          label: "Chats List",
          route: "/chat",
          description:
            "Direct + group conversations, unread badges, last-message preview.",
          live: true,
        },
        {
          id: "chat-detail",
          label: "Chat Detail",
          route: "/groupchat",
          description:
            "Real-time messages, attachments, share/settle an expense in chat, read receipts.",
          live: true,
        },
        {
          id: "notifications",
          label: "Notifications",
          route: "/notifications",
          description:
            "Requests, payment reminders, mentions, group activity; mark read; settings.",
          live: false,
        },
      ],
    },
    {
      id: "ai",
      label: "AI Assistant",
      color: "#a78bfa",
      pages: [
        {
          id: "ai-chat",
          label: "AI Chat",
          route: "/ai",
          description:
            "Natural-language queries; creates/edits expenses conversationally.",
          live: true,
        },
        {
          id: "receipt-scan",
          label: "Receipt Scan (OCR)",
          route: "/ai",
          description:
            "Camera/upload receipt, extract line items, auto-build an itemized split.",
          live: true,
        },
        {
          id: "spending-insights",
          label: "Spending Insights",
          route: "/ai",
          description:
            "Charts by category/time, trends, top spenders, monthly comparison.",
          live: true,
        },
        {
          id: "smart-suggestions",
          label: "Smart Suggestions",
          route: "/ai",
          description:
            "Settle-up nudges, recurring-expense detection, debt-simplification tips.",
          live: true,
        },
      ],
    },
    {
      id: "profile",
      label: "Profile & Settings",
      color: "#c084fc",
      pages: [
        {
          id: "profile-details",
          label: "Profile",
          route: "/profile",
          description: "Avatar, display name, bio, edit.",
          live: true,
        },
        {
          id: "account",
          label: "Account",
          route: "/settings",
          description:
            "Change email/phone/password, linked OAuth accounts, delete account.",
          live: true,
        },
        {
          id: "payment-methods",
          label: "Payment Methods",
          route: "/settings",
          description: "Add/manage UPI IDs, cards, bank handles for settle-up.",
          live: true,
        },
        {
          id: "preferences",
          label: "Preferences",
          route: "/theme",
          description:
            "Default currency, language, theme (dark/light), notification toggles.",
          live: true,
        },
        {
          id: "help-support",
          label: "Help & Support",
          route: "/help-center",
          description:
            "FAQ, contact support, report a bug, privacy/terms, about, logout.",
          live: true,
        },
      ],
    },
  ],
};

/** Core glow color (kept from the existing dark-neon look). */
export const CORE_COLOR = "#38bdf8";

export default APP_MAP;
