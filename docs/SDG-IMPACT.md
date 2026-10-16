# SDG Impact and Market Fit

Split-Expense (SplitEase) is an open-source (MIT) tool that lets small groups record
shared money, settle dues fairly, and see where their money goes. This document explains
who it serves, which UN Sustainable Development Goals (SDGs) it supports, and what
evidence backs each claim. Statements marked **[TO FILL]** need real project data
(pilots, metrics, letters) and are intentionally left for the maintainer to complete
truthfully before submission.

## 1. The problem

Shared everyday money (rent, groceries, travel, group savings and contributions) is
usually tracked in notebooks, memory or chat messages. The result is disputes, forgotten
dues, and no clear picture of monthly or yearly spending. Most existing apps are
closed-source, cannot be self-hosted or audited, and may restrict free use. Groups with
low income, such as students and self-help groups (SHGs), are the most affected.

## 2. Who it is for

| Group | Daily need | What the project provides (verified in this repository) |
|---|---|---|
| Students, hostel and flat mates | Split food, rent, travel and bills | Groups, equal and unequal splits, quick split, settle-up suggestions, QR/code invites, recurring expenses |
| General public, households | Know how much was spent this month or year | Per-user analytics endpoint (`GET /api/users/analytics`), balances, expense history, notepad |
| Self-help groups, community collectives | Transparent shared ledger visible to every member | Group ledger visible to all members, member management, group chat, settlement requests |

India-first design: default currency INR, UPI ID and UPI QR on user profiles (so dues
can be paid directly), plus multi-currency support with FX conversion for other users.

## 3. SDG mapping

Primary goal: **SDG 1, No Poverty, Target 1.4** (equal access to economic resources and
basic financial services).

| SDG | Target | Contribution | Evidence |
|---|---|---|---|
| **1** (primary) | 1.4 | A free, open and self-hostable tool for managing shared money; no paywall on core features | Pricing FAQ states all core features are free; MIT licence; **[TO FILL: pilot with SHG / student groups]** |
| 8 (supporting) | 8.10 | Builds everyday money-tracking habits and basic financial record keeping (monthly and yearly spending views) | Analytics feature; **[TO FILL: user feedback]** |
| 10 (supporting) | 10.2 | Social and economic inclusion: free, open, usable by low-income groups; code can be adapted by NGOs and communities | MIT licence; documented API; **[TO FILL: NGO / community partner]** |

Please confirm exact target wording at https://sdgs.un.org/goals before submission.

## 4. Why it fits the market

- **Frequency:** shared expenses happen daily for students and households, giving
  natural, repeated use rather than one-off use.
- **Low barrier:** free core features, mobile app (Expo) plus web, UPI-friendly.
- **Trust and transparency:** open code means groups and NGOs can inspect how balances
  are calculated; self-hosting keeps community data under community control.
- **Insight, not just splitting:** monthly and yearly spending views turn a settlement
  tool into a budgeting aid.
- **Adaptable:** documented REST API ([docs/API.md](API.md)) lets others build
  integrations, local-language front-ends, or SHG-specific workflows.

Market validation **[TO FILL]**: number of pilot groups, active users, expenses
recorded (anonymised), retention, and 2-3 short testimonials with consent. Do not
submit invented numbers; reviewers verify.

## 5. Evidence checklist

- [ ] One real pilot (SHG, hostel or college group) with user count and feedback
- [ ] Anonymised usage metrics (groups, active users, expenses recorded)
- [ ] Consented testimonial or short case study
- [ ] Endorsement or support letter from an NGO, SHG federation or institution
- [ ] Hindi / regional-language support plan (see DPG-COMPLIANCE roadmap)

## 6. Do no harm

See [PRIVACY.md](../PRIVACY.md), [SECURITY.md](../SECURITY.md) and
[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md). Users can block others, control who can
add them and whether they are discoverable by email, and can delete their account.
