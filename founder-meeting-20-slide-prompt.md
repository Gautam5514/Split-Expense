# Paste-ready prompt: SplitEase 20-slide founder meeting deck

Copy everything below into ChatGPT or another presentation generator. Replace every `[ADD ...]` placeholder with verified information before presenting.

---

You are an elite startup pitch-deck strategist, product storyteller, business analyst, and presentation designer. Create a polished, founder-meeting-ready PowerPoint deck of exactly 20 slides about my product, **SplitEase**.

The audience is founders, startup leaders, mentors, potential partners, and early-stage investors. The deck must be insightful, commercially credible, visually premium, and easy to present in 12–15 minutes. It must explain the real-world problem, who experiences it, why current methods fail, what SplitEase solves, how the product works, what has already been built, the technical strength, the business opportunity, and the next milestones.

## Non-negotiable accuracy rules

- Use only the facts supplied below.
- Do not invent users, growth, revenue, retention, market size, partnerships, testimonials, launch dates, payment integrations, or accuracy percentages.
- Where business data is unavailable, show an editable placeholder such as `[ADD MONTHLY ACTIVE USERS]` or `[ADD VERIFIED TAM SOURCE]`.
- Clearly label future functionality as **Roadmap**, **Planned**, or **Coming soon**.
- Do not claim that SplitEase holds money, moves money, or is a regulated payment product. It records and simplifies shared-expense obligations and settlements.
- Do not call a greedy settlement routine “mathematically optimal” unless proven. Describe it as reducing or simplifying the number of payments.
- Use the product spelling **SplitEase** consistently.
- Currency examples may use Indian rupees (₹), but do not claim multi-currency support; multi-currency is planned.

## Product truth from the codebase

SplitEase is an all-in-one shared-expense management platform available through a responsive Next.js web experience/PWA and an Expo React Native mobile application. Its backend is an Express/Node.js API with MongoDB/Mongoose. Real-time communication uses Socket.IO.

The product supports:

- Creating groups for trips, roommates, and general shared spending.
- Inviting members through shareable invite links and QR-code-based flows.
- Recording expenses with a description, amount, payer, date, category, participants, and receipt image.
- Equal, exact-amount, and percentage splits, including splitting among only selected participants.
- Categories including general, food, travel, stay, shopping, and bills.
- Automatic net-balance calculation for every group member.
- Settlement suggestions that match debtors and creditors to simplify the payments required to clear a group.
- Recording settlement transactions so balances update correctly.
- Receipt-image upload through Cloudinary and OCR text extraction through a persistent Tesseract worker.
- A built-in SplitEase AI assistant using Gemini or OpenAI. It can answer questions from a user’s live groups, expenses, balances, settlements, categories, and notes.
- A lower-cost “smart query” layer that answers common questions directly from app data before invoking an LLM—for example this month’s spending, category breakdowns, balances, recent expenses, group summaries, and who owes whom.
- Short conversational context for follow-up AI questions; AI conversation history is not persisted by the backend.
- Group chat and direct chat, including real-time messages, typing state, online presence, last active state, and group expense coordination.
- Notifications, including Firebase-based push infrastructure.
- Shared group notepads/checklists for coordinating trip or household tasks alongside expenses.
- Referral codes, invite rewards, coin transactions, reward tiers, themes, and gamified engagement. Current product copy describes 50 coins for the referrer and 25 for the new user; verify this against production settings before presenting.
- Secure authentication using Firebase ID tokens, email/Google flows, OTP-related account flows, server-side membership checks, input validation, rate limiting, and protected group/conversation room joins.
- Responsive access across phone, tablet, and desktop, plus native-oriented Android/iOS project structure through Expo.

Current product positioning: core SplitEase features are free. A future optional **SplitEase Pro** is planned for power capabilities such as reports, exports, multi-currency, priority scanning, bulk receipt import, and automatic reminders. Do not represent planned features as live.

## The real-world problem to communicate

Shared spending is a coordination problem, not just an arithmetic problem. In trips, shared flats, college groups, office outings, couples, clubs, and event teams:

- One person pays while several people consume different things.
- Receipts are lost and expenses are entered late or incorrectly.
- Equal splitting is unfair when participation or consumption differs.
- Balances become fragmented across messages, notes, spreadsheets, and payment apps.
- People repeatedly ask “Who paid?”, “Who owes whom?”, and “Is this settled?”
- Chasing friends for money creates awkward social friction.
- Existing workflows force users to jump among a calculator, receipt scanner, chat app, notes app, and payment app.
- Manual reconciliation gets harder as group size and transaction count grow.

SplitEase solves this by connecting the whole lifecycle in one shared source of truth:

**Create group → invite people → capture expense/receipt → choose participants and split method → update balances → discuss in context → receive a simplified settlement plan → record settlement → understand spending with AI.**

## Primary users and use cases

Prioritize these user segments:

1. Friends and travel groups sharing stays, transport, food, tickets, and activities.
2. College students and young professionals living with roommates and sharing rent-related bills, groceries, utilities, and subscriptions.
3. Couples and families managing recurring shared household spending.
4. Office teams, clubs, and event groups handling meals, outings, supplies, and reimbursements.
5. Group organizers—the person who normally pays first, maintains the spreadsheet, or chases everyone afterward.
6. Digitally active users who want mobile-first, UPI-friendly, low-friction coordination in India.

Use three vivid user scenarios in the deck:

- A Goa trip where different friends join different activities and bills need selected-participant, exact, or percentage splits.
- A shared flat where groceries, utilities, and household tasks recur throughout the month.
- An office dinner where one receipt must be captured, allocated, discussed, and settled quickly.

## Required 20-slide structure

### Slide 1 — Cover: “SplitEase — Shared expenses, without shared stress”

- Subtitle: “An intelligent operating layer for group spending—from receipt to settlement.”
- Add presenter name, role, meeting name, and date placeholders.
- Visual: polished product montage using existing web/mobile screenshots; minimal text.
- Speaker takeaway: SplitEase turns a fragmented, socially awkward process into one coordinated flow.

### Slide 2 — Founder insight: the problem is bigger than splitting math

- Headline: “The calculator was never the hardest part.”
- Show four connected sources of friction: capture, fairness, coordination, settlement.
- Explain the emotional cost: confusion, repeated follow-ups, mistrust, and awkward reminders.
- Visual: a messy journey across receipt, calculator, WhatsApp, spreadsheet, and payment app.

### Slide 3 — Who feels this pain most

- Present the six target segments listed above.
- Identify the initial beachhead: travel groups, students, roommates, and young professionals.
- Highlight the “group organizer” as the power user and natural acquisition champion.
- Visual: user-segment cards with situation, pain, and frequency.

### Slide 4 — Three real-life stories

- Use the Goa trip, shared flat, and office dinner scenarios.
- For each, show “before SplitEase” and “with SplitEase.”
- Keep each scenario specific, human, and outcome-oriented.
- Visual: three mini journey panels.

### Slide 5 — Why current alternatives remain incomplete

- Compare manual notes/spreadsheets, chat apps, payment apps, traditional expense splitters, and SplitEase.
- Comparison dimensions: receipt capture, flexible splits, live balances, contextual chat, task notes, AI answers, settlement guidance, cross-device experience.
- Avoid unsupported attacks on named competitors; use category-level comparison unless verified research is added.
- Visual: clean comparison matrix.

### Slide 6 — The SplitEase solution

- Headline: “One shared source of truth from first payment to final settlement.”
- Explain the unified product loop.
- State the core value proposition: less manual entry, fairer allocation, fewer reconciliation steps, clearer accountability.
- Visual: circular or horizontal workflow diagram.

### Slide 7 — Product journey: create, capture, clear

- Step 1: Create a trip/roommate/general group and invite via link or QR.
- Step 2: Add an expense manually or attach a receipt; select payer, category, participants, and split type.
- Step 3: View live net balances, follow settlement suggestions, and record payments.
- Add chat, notifications, and notes as supporting layers across all three steps.
- Visual: annotated screen sequence.

### Slide 8 — Flexible splitting built for real behavior

- Explain equal, exact, percentage, and selected-participant splitting.
- Include one numerical example: ₹6,000 dinner, four friends, only three shared food, one paid a different exact amount. Demonstrate how flexibility prevents unfair equal division.
- Mention validation and rounding handling without excessive engineering jargon.
- Visual: one expense flowing into three split choices.

### Slide 9 — Receipt intelligence: remove the typing bottleneck

- Explain image upload, receipt attachment, OCR extraction, and persistent OCR worker.
- Be accurate: OCR extracts receipt text; do not promise perfect itemization accuracy unless verified by testing.
- Explain user benefit: faster capture, preserved evidence, and fewer forgotten expenses.
- Add placeholder for measured scan time and OCR accuracy: `[ADD VERIFIED OCR METRICS]`.
- Visual: receipt → OCR text → expense record.

### Slide 10 — Balance intelligence and simplified settlements

- Explain how every expense credits the payer and debits participant shares.
- Show debtor/creditor netting and a simplified payment plan.
- Use a clear four-person before/after example with fewer transfers.
- Explain that recorded settlements become part of the ledger and update balances.
- Visual: tangled payment lines transforming into a clean set of settlement arrows.

### Slide 11 — SplitEase AI: ask your money, don’t search for it

- Example questions: “How much did I spend this month?”, “Who owes me?”, “What did I spend on food?”, “Summarize my Goa group,” and a contextual follow-up.
- Explain the hybrid design: common intents are answered directly from structured app data; complex questions use Gemini or OpenAI with user-specific context.
- Benefits: fast answers, lower LLM cost for repeat queries, and better factual grounding.
- Privacy detail: recent context is request-scoped and AI conversation history is not persisted by the backend.
- Visual: chat answers paired with supporting expense data.

### Slide 12 — Money and conversation in the same context

- Show group chat, direct chat, typing indicators, presence, last active, notifications, and receipt/expense coordination.
- Explain why this matters: decisions and financial records stop living in separate apps.
- Mention server-side membership verification before joining protected chat/group rooms.
- Visual: group chat alongside an expense card and balance update.

### Slide 13 — More than expenses: group coordination and engagement

- Shared notepads/checklists keep trip or household tasks beside the money.
- Invite links and QR codes reduce onboarding friction.
- Referral coins, reward tiers, themes, and badges create an acquisition/retention loop.
- Clearly separate utility value from gamification.
- Visual: utility loop connected to referral/reward loop.

### Slide 14 — What is already built

- Use a product capability map with these live codebase areas: authentication; profiles; groups; invite/join; expenses; flexible splits; receipt upload/OCR; balances; settlement recording; AI assistant; direct/group chat; notifications; notepads; referral/coins; responsive web/PWA; Expo mobile app.
- Label anything that still requires production validation as “Built; validate before scale.”
- Add placeholders for deployment and release status: `[ADD LIVE URL]`, `[ADD ANDROID/iOS STATUS]`.
- Visual: product map, not a long bullet list.

### Slide 15 — Technology and architecture

- Frontend: Next.js 16, React 19, Tailwind CSS, Framer Motion, Recharts, Firebase client, Socket.IO client.
- Mobile: Expo/React Native with shared backend API and push-notification support.
- Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO.
- Intelligence/media: Tesseract OCR, Gemini/OpenAI provider choice, Cloudinary uploads.
- Security/reliability: Firebase token verification, JWT-related backend support where applicable, validation, group membership checks, rate limiting, 30-second balance cache with write invalidation, and global error handling.
- Visual: layered architecture diagram from clients to API/services/data.

### Slide 16 — Differentiation and defensibility

- Present four product advantages: end-to-end workflow, contextual data intelligence, social coordination, and multi-surface accessibility.
- Explain potential compounding assets without overstating them: structured expense graph, user workflow data, refined intent routing, and habit/referral loops.
- State honestly: the moat must be earned through adoption, data quality, trust, and execution; features alone are replicable.
- Visual: four concentric advantage rings or a defensibility flywheel.

### Slide 17 — Market and go-to-market hypothesis

- Do not invent market numbers. Include `[ADD VERIFIED TAM/SAM/SOM WITH SOURCES]`.
- Bottom-up initial wedge: campuses, shared housing, group travel, young professionals, office/event organizers.
- Acquisition motions: organizer-led invites, QR/link group onboarding, referral rewards, campus ambassadors, travel-community partnerships, creator demonstrations, and SEO content around splitting scenarios.
- Explain the product-led loop: one organizer creates a group → invites several members → members reuse SplitEase in their next groups.
- Visual: wedge strategy plus viral loop.

### Slide 18 — Business model and economics hypothesis

- Current: free core product to reduce group adoption friction.
- Planned optional SplitEase Pro: reports, exports, multi-currency, bulk receipt import, priority scanning, automatic reminders, and power-user capabilities.
- Possible future revenue hypotheses, clearly labeled for validation: premium subscription, organizer/team tier, partner offers, and carefully designed fintech/payment referral revenue where legally and strategically appropriate.
- Add placeholders: `[ADD PRO PRICE TEST]`, `[ADD AI/OCR COST PER ACTIVE GROUP]`, `[ADD TARGET CONVERSION]`.
- Visual: free-to-growth-to-premium value ladder.

### Slide 19 — Validation, metrics, and roadmap

- Create two sections: “Evidence today” and “Next 12 months.”
- Evidence placeholders: `[TOTAL REGISTERED USERS]`, `[MAU]`, `[GROUPS CREATED]`, `[EXPENSES LOGGED]`, `[INVITE CONVERSION]`, `[WEEK-4 RETENTION]`, `[SETTLEMENTS RECORDED]`, `[AI QUERIES]`, `[USER QUOTES]`.
- Roadmap phases: production hardening and analytics; onboarding/receipt-quality improvements; retention/reminders; Pro experiments; multi-currency/exports; scalable partnerships.
- Include risks and mitigations: cold start/group adoption, OCR variability, trust/security, AI cost, settlement compliance, and crowded category.
- Visual: metric dashboard plus phased roadmap.

### Slide 20 — Closing and founder ask

- Headline: “Make every shared experience easier to enjoy—and easier to settle.”
- Recap in three lines: real recurring pain; integrated working product; distribution through groups.
- State the specific meeting ask with placeholders: `[ASK: mentorship / pilot users / partnership / hiring / funding]`, `[AMOUNT OR RESOURCE NEEDED]`, `[NEXT MILESTONE ENABLED]`.
- End with QR code placeholder for demo/product and contact details.
- Visual: strong product hero with one memorable closing statement.

## Presentation-writing instructions

- Give every slide a sharp assertion-style headline, not a generic topic label.
- Use at most 3–5 concise points per slide and no dense paragraphs.
- For every slide provide: slide number, headline, on-slide copy, recommended visual, and 30–45 seconds of speaker notes.
- Keep the narrative logical: pain → users → solution → product proof → technology → business → validation → ask.
- Make the language confident but honest, specific, and free of exaggerated startup clichés.
- Use realistic examples to make the product tangible.
- Explain technical details in terms of user or business benefit.
- Flag every claim that needs founder verification with `[VERIFY]`.
- Finish with an appendix-style list (outside the 20-slide count) of all placeholders the founder must complete.

## Visual design direction

- Premium dark theme inspired by the existing SplitEase interface: near-black/charcoal background, white typography, cyan accent, and subtle emerald/violet highlights.
- Modern editorial typography, high contrast, generous negative space, rounded product frames, thin grid lines, and restrained glass effects.
- 16:9 widescreen layout.
- Use authentic SplitEase screenshots and assets wherever possible; do not substitute unrelated finance-app mockups.
- Suggested repository assets: `logo-full.png`, `logo-icon.png`, `laptop.webp`, `mobile.webp`, `tablet.webp`, `split.webp`, `ocr_recept.webp`, `ai_expense.webp`, `live_balance_tracking.webp`, `groupchat.webp`, `qrlink.webp`, `create_invite.png`, `logs.png`, and `settle.png`.
- Use diagrams, workflows, before/after visuals, charts, and annotated UI instead of decorative stock photos.
- One central idea per slide. Avoid tiny text, unnecessary 3D charts, excessive animation, and generic AI imagery.
- Add a small footer with “SplitEase | Confidential” and slide number.

## Required output

First, produce the complete slide-by-slide content and speaker notes for review. Then generate an editable `.pptx` with exactly 20 slides. Ensure all text, diagrams, tables, and placeholders are editable. Preserve image aspect ratios. Run a final quality check for factual accuracy, spelling, visual overflow, contrast, slide count, and roadmap labeling.

