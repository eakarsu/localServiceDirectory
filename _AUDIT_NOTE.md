# Audit Apply Notes — localServiceDirectory

Source: `_AUDIT/reports/batch_10.md` § Partial-builds #27 localServiceDirectory

## Original audit recommendations

> Modern Next.js fullstack (27 pages + likely 29 API routes). Frontend-focused with backend API coverage of search/booking/messaging.
> Inferred AI features: search ranking, review analysis, recommendation engine, provider matching, fraud detection.

The actual `src/app/api/ai/` directory only contains `chat`. The audit's "29 AI endpoints" appears to be inferred from the page count rather than measured. Reality is closer to "1 explicit AI endpoint plus implicit AI-assisted endpoints embedded inside non-`ai/` route handlers".

### What's missing
- Real-time availability/booking status
- Service provider verification/vetting
- Price comparison and quote aggregation
- Review sentiment analysis and spam detection
- AI service matching (user needs → provider matching)

## Implemented this pass

**None.** This pass is backlog-only.

Reason: Next.js App Router places each route handler in its own folder (`route.ts` files), so adding an endpoint requires creating a new folder + file + Prisma context — that's still mechanical, but without an audit-confirmed OpenRouter wrapper or pattern to mirror inside this project, the safe mechanical step is to mirror an existing handler. The only AI-typed route folder (`ai/chat`) was not inspected this pass for shape, so adding another pattern alongside it (even if mechanical) risks divergence. Backlog with concrete next-pass actions.

## Backlog (not implemented)

### Mechanical (next pass — once `ai/chat/route.ts` shape is confirmed)
- `ai/match-provider/route.ts` — service-needs to provider matching (audit: "AI service matching").
- `ai/review-analysis/route.ts` — review sentiment + spam detection (audit: "Review sentiment analysis and spam detection").
- `ai/quote-aggregator/route.ts` — multi-provider quote comparison.

### Needs schema/data model work
- Real-time availability — needs presence/availability schema + WebSocket or polling decision.
- Provider verification/vetting — KYC workflow, document storage, attestation states.

### Needs product decision
- Fraud detection thresholds and review-spam taxonomy.
- Quote-comparison fairness rules (anti-collusion).

## Categorisation

- MECHANICAL but skipped pending shape verification: provider matching, review analysis, quote aggregator.
- NEEDS-SCHEMA: availability, verification.
- NEEDS-PRODUCT-DECISION: fraud thresholds, anti-collusion.

## Apply pass 3 (frontend)

LEFT-AS-IS. The single backend AI endpoint `POST /api/ai/chat` is already consumed by `src/components/chat/ChatWidget.tsx` via `fetch('/api/ai/chat', ...)`. Auth is NextAuth session-cookie based (not JWT-Bearer-from-localStorage), so the canonical pass-3 pattern doesn't apply here. The `match-provider`, `review-analysis`, and `quote-aggregator` endpoints from the backlog are not yet implemented on the backend, so there is no FE wiring to add this pass.

Note (out of scope for FE pass): `src/app/api/ai/chat/route.ts` throws on missing `OPENROUTER_API_KEY` rather than returning 503; surface to backend pass for later cleanup.

## Apply pass 4 (mechanical backlog)

Implemented all 3 mechanical Next.js backlog items, plus a dashboard AI Center page that wires them up.

Shared helper:
- `src/lib/openrouter.ts` — typed OpenRouter wrapper (`callOpenRouter` returns a discriminated union; missing `OPENROUTER_API_KEY` ⇒ `{ ok: false, status: 503 }`). 3-strategy `parseAIJson` exported for handlers. Existing `src/app/api/ai/chat/route.ts` is left untouched (its inline implementation predates this helper and conversion is out of scope).

Backend (App Router route handlers, NextAuth `getServerSession` + `authOptions` for auth — matches existing project pattern; not JWT-bearer):
- `POST /api/ai/match-provider` — body `{ needs, city?, state?, budgetMax?, categorySlug? }`. Loads up to 20 active business candidates (filtered by city/state/category if provided), passes them to the LLM, returns ranked matches with fit score / why / price signal / caveats. 503 on no key.
- `POST /api/ai/review-analysis` — body `{ businessId? | reviewIds?, lookbackDays? }`. Returns sentiment breakdown, theme clusters, spam candidates, response priorities. Short-circuits with empty result when no reviews in window. 503 on no key.
- `POST /api/ai/quote-aggregator` — body `{ quoteRequestId? | quoteRequestIds? | serviceDescription? }`. Aggregates the user's `QuoteRequest`s (with `business` + `quote` joins) or, if only a service description is provided, surfaces top candidate businesses for synthetic comparison. Returns side-by-side comparison, best-fit pick, price range, red flags, caveats. 503 on no key.

Frontend:
- `src/app/(dashboard)/dashboard/ai-center/page.tsx` — three-tab AI Center (Match Provider / Review Analysis / Quote Aggregator) using existing `Card` / `Button` / `Input` / `Textarea` / `lucide-react` components and the dashboard's NextAuth-cookie auth (no JWT bearer header — this project's pattern). 503 responses are surfaced as "Configure OPENROUTER_API_KEY" hints; other failures show server error text. JSON results render inline.
- `src/components/layout/DashboardSidebar.tsx` — added `AI Center` (Sparkles icon) entry between Messages and Settings.

Type-check: `tsc --noEmit -p .` passes cleanly. No new dependencies; no `npm install` was run.

Cap: 4 mechanical items (3 endpoints + 1 dashboard page) — under the 5/project limit. Remaining backlog (real-time availability, provider verification, fraud thresholds, anti-collusion rules) is unchanged: NEEDS-SCHEMA / NEEDS-PRODUCT-DECISION.
