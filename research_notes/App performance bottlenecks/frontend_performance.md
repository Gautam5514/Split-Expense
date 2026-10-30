# Frontend (Next.js 16 app router) performance bottlenecks

All paths relative to /Users/kunalkumar/Desktop/Gautam/Split/frontend. Evidence is from local code and the existing .next build; no web sources used (none needed). AGENTS.md says Next has breaking changes and to read node_modules/next/dist/docs; I did not find any bottleneck that depends on those docs.

## 1. Client-side data fetching, waterfalls, and caching

### Takeaway
Every authenticated page is a "use client" component that fetches in useEffect after auth resolves, with no cache layer (no SWR/React Query; deps are only axios, firebase, framer-motion, lenis, lucide-react, recharts, @xyflow/react, socket.io-client, etc. - package.json:12-25). Each navigation re-fetches everything and shows a spinner. Realtime events trigger full refetches.

### Cited Findings
- HIGH: No data-cache library. package.json dependencies contain no swr/@tanstack/react-query; all fetching is raw `api.get` in effects. Navigating dashboard -> group -> dashboard refetches each time. (package.json:12-25)
- HIGH: Fetch only starts after hydration + Firebase auth restore. app/dashboard/page.jsx:47-50 `useEffect(() => { if (!token) return; fetchGroups(); }, [token])`; only after JS loads, hydrates, and `AuthProvider` receives onIdTokenChanged (context/AuthContext.jsx:19-45). Fail-safe waits up to 6000 ms (AuthContext.jsx:21). Chain: JS download -> hydrate -> Firebase IndexedDB restore -> getIdToken -> GET /groups -> render. 79 files are "use client"; 9 of ~30 pages are server components (all static marketing/legal pages); dashboard, groups/[id], chat, ai, profile, settings, users are all client-only.
- HIGH: Every request is gated by an async interceptor that dynamically imports firebaseClient, awaits `auth.authStateReady()` and `getIdToken()` (lib/api.js:9-44). Token is cached by Firebase, so the cost is mostly microtask/async overhead on hard refresh, but there is no request dedupe/cache/abort. Same endpoint called from multiple components is fetched multiple times.
- MED-HIGH: Duplicate `/users/me` calls: app/groups/[id]/page.jsx:185, components/chat/ChatWindow.jsx:56-58 and components/chat/ChatList.jsx:40 both fetch it on mount (chat page mounts both -> 2 identical requests), plus users page.
- MED: Group detail page fires 7 independent requests in one effect (groups/[id]/page.jsx:179-192: /users/me, /groups/:id, /expenses/:id, /balances/:id, settle/pending, /summary, /invites). They are parallel (not a waterfall) but 6 HTTP round trips + token interceptor each; no aggregate endpoint. Each fetcher has independent toast.error on failure (:110-175).
- MED: `fetchGroup` sets `setLoading(true)` (groups/[id]/page.jsx:109) so any realtime "member"/"reconnect" refetch can flip the whole page back to the loader (check :197-210).
- MED: Realtime refetch amplification: useRealtime (lib/useRealtime.js:20-48, 250 ms debounce) triggers on every `groupUpdate`; group page handler refetches 4 endpoints (balances, expenses, settlements, summary) + 2 more for member events (groups/[id]/page.jsx:197-211). Whole expense list is re-downloaded for one new expense. Same pattern in app/users/page.jsx:100-106 which does 5 parallel calls (analytics, groups, profile, me, summary) on each dashboardUpdate.
- MED: Chat is sequential: ChatList loads `/users/me` then `/chat/my-contacts` serially (ChatList.jsx:40-43, an avoidable waterfall - independent calls awaited one after another). ChatWindow then POST /chat/conversation (if no id) then GET /chat/messages (ChatWindow.jsx:81-90) - sequential by dependency but no message pagination visible (loads all messages: `setMessages(msgs.data)` :92).
- LOW-MED: Notifications: NotificationProvider (root layout) calls GET /notifications on mount and on every tab visibilitychange (context/NotificationContext.jsx:~233-262), plus FCM token registration with retry/backoff (:~120-165), on every page including marketing pages for logged-in users. No setInterval polling anywhere in app/components/context/lib (only OTP cooldown, recording timer and one home carousel: IntelligenceSection.jsx:32).

### Inferences
- Moving first-load data to server components (or at least prefetching) is not trivial because auth is Firebase client-side only (token never reaches Next server), so the realistic fix is a client cache (SWR/React Query) with stale-while-revalidate and a prefetch on link hover, plus an aggregate group endpoint.

### Gaps
- Did not measure real network timings or backend latency; backend response times are out of scope here.

## 2. Context providers, re-renders, lists, sockets

### Takeaway
Provider values are fresh object literals each render and the root wraps the entire app, so state changes ripple widely; sockets are duplicated; chat lists aren't virtualized or memoized.

### Cited Findings
- MED: Provider values not memoized: AuthContext `value={{ token, setToken, loading }}` (context/AuthContext.jsx:52), SidebarContext `value={{ collapsed, toggleSidebar }}` (SidebarContext.jsx:46), NotificationContext `value={{ notifications, setNotifications, hasUnread, ... markAllAsRead, markOneAsRead }}` (NotificationContext.jsx:~200). Every provider re-render re-renders all consumers (MainWrapper, Navbar, sidebar, pages). Notification arrivals update state in a provider wrapping the whole app, so each push re-renders every `useNotifications` consumer and children are not isolated.
- MED: MainWrapper (components/MainWrapper.jsx) subscribes to Auth + Sidebar + pathname, so every page remounts layout classes on collapse toggles; low cost but sits on the critical path of everything.
- MED: Two separate socket.io connections per session: NotificationContext creates its own `io(API_URL, { transports: ["websocket","polling"] })` (NotificationContext.jsx:~145-172) while lib/socket.js creates another singleton `io(API_URL, {transports:["websocket"]})` used by chat and useRealtime (lib/socket.js:5-8). Chat/group pages hold two sockets open and emit "register" on both.
- LOW-MED: Socket handlers use `socket.off("newMessage")` without handler reference (ChatList.jsx:91-92, ChatWindow.jsx:160-162), removing ALL listeners for that event, including ones registered by other components (ChatList and ChatWindow both listen to "newMessage" on the same singleton) - correctness bug that can cause missing updates/re-fetch workarounds, not strictly perf.
- MED: Chat lists not virtualized/memoized: `filteredMessages.map(...)` renders all messages (components/chat/ChatWindow.jsx:426; groupchat/GroupChatWindow.jsx:398), every state change (typing, `setMessages` status updates via `prev.map`) re-renders every bubble including inline <video> elements (:485). No React.memo in chat or group components; grep for memo( found none in the files inspected. Messages loaded unpaginated (:92).
- MED: Files are sent as base64 in JSON (`fileToBase64` components/chat/ChatInput.jsx:71, used :109; ChatWindow.jsx:234 retry) - ~33% size inflation, blocks main thread during encode, and goes through the single API.
- LOW: groups/[id]/page.jsx is a 1516-line single component with ~25 useState hooks (sample :97-106), so any state change (menu toggle, modal) re-renders the whole tree; only two useMemo (:303, :325), expense list is sliced to 9 initially (:403) which mitigates. app/users/page.jsx 785 lines, ai/page.jsx 644 lines, similar structure.
- LOW: Root layout mounts CustomCursor with a window mousemove listener (components/CustomCursor.jsx:121) and InstallPrompt on all routes (layout.jsx:239-240); SmoothScroll (Lenis, rAF loop forever) is mounted per marketing page (components/SmoothScroll.jsx:13-25).

### Gaps
- No React Profiler run; re-render counts are inferred from code structure.

## 3. Bundle weight, fonts, images, assets, build output

### Takeaway
Landing page is reasonably code-split, but the app shell eagerly ships recharts/firebase/framer-motion, the CSS import of 8+ Google font families is render-blocking, and public/ is 37 MB with unoptimized multi-MB PNGs.

### Cited Findings
- HIGH: globals.css line 1 `@import url("https://fonts.googleapis.com/css2?family=Poppins...&family=Nunito...&family=DM+Sans...&family=Plus+Jakarta+Sans...&family=Outfit...&family=Instrument+Serif...&family=Playfair+Display...&family=Caveat...&family=Josefin+Sans...")` (app/globals.css:1). A CSS @import of an external stylesheet is render-blocking, adds a cross-origin DNS+TLS+CSS+font chain, and 9 families x up to 7 weights. This sits on top of three next/font families already self-hosted (layout.jsx:20-40: Inter 7 weights, Satisfy, Bricolage 7 weights). Likely the single biggest first-paint cost for every page.
- HIGH: Compiled CSS chunk is 310 KB (.next/static/chunks/1qxm03d_9yrbx.css, 310,022 bytes) plus three smaller ones; render-blocking on every route. (Content not inspected; likely Tailwind output + inlined globals.)
- HIGH: public/ = 37 MB (du). public/blog = 24 MB across 14 PNGs of 0.6-2.4 MB each (e.g. blog/group-trip.png 2.4M, split-bill-methods.png 2.2M, friends-split-dinner.png 2.2M). Other large PNGs: hero-friends-expense.png 1.8M, mcp-hub.png 1.6M, auth-network-v2.png 1.4M, dashboard-journey-hero.png 968K, features-bg.png 850K, showcase-bg.png 772K, logo-full.png 668K, logo-icon.png 327K, icons/icon-512x512.png 327K. hero_video.webm 586K.
- MED: Images: next/image is used in only 8 places versus 20 `<img>` tags (grep counts: `<img` = 20-ish lines incl. app/blog/[slug]/page.jsx:162,171,199; app/careers/page.jsx:109,115; app/downloadapp/page.jsx:102; app/security/page.jsx:11; groups/[id]/page.jsx:1258; layout/admin logos). Blog article pages use raw <img> for the multi-MB covers, bypassing resizing/WebP/AVIF. (BlogCover.jsx:1,24 does use next/image, so the blog index is OK.) The logo `<img src="/logo-concept-app.svg">` is fine (SVG).
- MED: Build output: .next/static = 3.8 MB, 82 chunk files. Largest chunks: 366,731 B (contains recharts, 68 matches for "recharts"; chunk id 1u4ti1ntxsd9v.js), 229,597 B, 183,114 B, 158,637 B, 112,594 B, 110,798 B (uncompressed, Turbopack build). The recharts chunk is large; recharts is imported by app pages (see dep list) and not dynamically imported (only dynamic() uses: app/page.jsx:19-26 landing sections, ShowcaseSection.jsx:15 Globe, HeroSection.jsx:11 simulator). No next/dynamic on dashboard, groups/[id] (imports AddPeopleModal, AddExpenseModal, InviteModal, MembersModal, GroupSettingsModal, OcrViewModal, framer-motion statically: groups/[id]/page.jsx:8-67), chat, ai. Modals which are closed by default are in the initial bundle for the page.
- MED: Root layout imports and eagerly ships for every route: Toaster (react-hot-toast), NotificationProvider (socket.io-client, lucide, firebase messaging via lib/firebaseMessaging), AuthProvider (firebase/auth), Navbar, AppSidebar, DesktopAppNavbar, CustomCursor, InstallPrompt (layout.jsx:1-17). Static marketing pages (about, privacy, terms) therefore still download firebase auth + socket.io + notification code.
- MED: Heavy deps in package.json: firebase ^12 (auth + messaging), framer-motion ^12 (used on 79 client files incl. groups page, users page, ai page), recharts ^3, @xyflow/react (mind map, used on landing via dynamic), lenis, socket.io-client (loaded in two places). lucide-react is imported by name (tree-shakeable).
- LOW-MED: Landing hero video: `<video autoPlay preload="metadata" poster="/hero-friends-expense.png">` (components/home/HeroSection.jsx:59-70); the poster is a 1.8 MB PNG used for a tiny pill-shaped video, loaded on first paint.
- LOW: next.config.ts has no `experimental.optimizePackageImports`, no `images.formats`, no compression/caching headers for static assets beyond Next defaults; images.remotePatterns present (next.config.ts:7-20). Security headers only. Public images served with default caching (Next sets `public, max-age=0, must-revalidate` for /public files unless overridden - from general Next behavior, not verified in this repo).
- POSITIVE: next/font used with display: "swap" (layout.jsx:20-40); landing page uses dynamic() + LazySection for below-the-fold sections (app/page.jsx:19-26, components/LazySection.jsx); expense list is truncated to 9 initially (groups/[id]/page.jsx:403); useRealtime debounces and reconnect-refetches; chat ChatWindow clears stale messages and skips conversation round-trip when id known (ChatWindow.jsx:60-90).

### Gaps
- Did not run next build analyzer; chunk-to-route mapping beyond the recharts match is unconfirmed. Gzip/brotli sizes not measured.
- Did not verify exactly which pages import recharts.

## Ranked summary with fixes

| Rank | Issue | Impact | Fix |
|---|---|---|---|
| 1 | Render-blocking Google Fonts @import of 9 families, app/globals.css:1 | High | Delete import; load only used families via next/font (or `<link rel=preconnect>` + subset weights); audit which of Poppins/Nunito/DM Sans/Outfit/Playfair/Caveat/Josefin are really used |
| 2 | No client cache + fetch-after-auth on every page (dashboard:47, groups/[id]:179, users:100, chat) | High | Add SWR or TanStack Query with stale-while-revalidate, shared keys (`/users/me`, `/groups`), prefetch on link hover; render cached data instantly |
| 3 | 37 MB public/, 2 MB PNG blog covers, raw <img> on blog article page and others | High | Convert to WebP/AVIF at ~1600px, use next/image everywhere (blog/[slug]:162,171,199, careers, downloadapp, security) |
| 4 | Group page issues 7 requests and refetches 4-6 on every realtime event | Med-High | Single aggregate endpoint; apply socket payload deltas to state rather than refetching; avoid setLoading(true) on refetch |
| 5 | Eager heavy app shell in root layout (firebase, socket.io, notifications, cursor) and no dynamic() for recharts/modals | Med | next/dynamic modals and charts; `optimizePackageImports` for framer-motion/lucide/recharts; mount CustomCursor/InstallPrompt lazily; scope NotificationProvider to logged-in routes |
| 6 | Two socket connections and global `socket.off(event)` | Med | Use one shared socket (lib/socket.js) in NotificationContext; pass handler refs to off() |
| 7 | Chat: unvirtualized, unmemoized, unpaginated lists; base64 uploads | Med | Paginate messages, memoize bubble component, virtualize (react-virtuoso), upload via multipart/signed URL |
| 8 | Unmemoized context values | Low-Med | useMemo the provider value; split notification state from actions |
| 9 | 310 KB CSS chunk | Med | Check for @source scanning too broad / unused globals; inspect with analyzer |
| 10 | Sequential `/users/me` then `/chat/my-contacts` in ChatList.jsx:40-43; duplicate `/users/me` | Low-Med | Promise.all; share via cache/context |
