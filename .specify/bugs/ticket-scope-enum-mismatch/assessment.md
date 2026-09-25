# Bug Assessment: Ticket list `scope` query param sends wrong enum value (`created` instead of `mine`)

- **Slug**: ticket-scope-enum-mismatch
- **Created**: 2026-09-25
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim)

> I can see there is still issue with ticket listing API. As per the api documentation the enums for field `scope` are different from the one which we are sending right now.

## Symptom

`GET /api/v1/tickets` is called with `scope=created` when the user picks "Created by me" in the ticket list's "Show" dropdown. `backend-api-doc.json`'s documented values for this parameter are **`mine`, `assigned`, or `all`** — `created` isn't one of them. Expected: selecting "Created by me" filters to the signed-in user's own tickets; actual behavior against the real backend is unverified but almost certainly wrong (falls back to `all`, or is rejected), since `created` doesn't match the documented contract.

## Reproduction

1. Sign in.
2. On the ticket list page, open the "Show" dropdown and select "Created by me."
3. Frontend calls `GET /api/v1/tickets?scope=created&...`.
4. `backend-api-doc.json` (lines 67-76) documents `scope`'s valid values as "mine, assigned, or all (default: all)" — `created` isn't among them.

[NEEDS CLARIFICATION: does the real backend reject an unrecognized `scope` value outright (e.g. `400`), or silently fall back to its `all` default? The OpenAPI schema for this parameter has no `enum` array (just `{"type": "string", "default": "all"}`), so this can't be confirmed from the doc alone — either way, the filter doesn't do what the user selected.]

## Suspected Code Paths

- `src/types/requests.ts:19` — `export type TicketOwnershipScope = "created" | "assigned" | "all";` — the `"created"` value doesn't match the documented `"mine"`.
- `src/pages/TicketListPage.tsx:30-40` — `scopeOptions` uses `{ value: "created", label: "Created by me" }` in both the `GENERAL` and non-`GENERAL` branches — this is where the wrong value originates (a user-facing label "Created by me" was named after the concept, not the wire value, and no one reconciled it with the actual API param).
- `src/api/ticketsApi.ts:14-20` — passes `params.scope` straight through as the `scope` query param with no translation, so whatever `TicketOwnershipScope` value is selected goes directly on the wire unchanged.
- `tests/msw/handlers.ts:210-217` — the mock backend's list handler checks `if (scope === "created")` / defaults `"all"` `GENERAL`-only filtering also against `t.createdBy.id === user.id` — i.e. the **mock was written to accept the same wrong `"created"` value**, so `tests/integration/ownership-scope-filter.test.tsx` passes today despite the real contract mismatch. This is the same blind-spot pattern found in every prior bug this session ([[login-no-redirect]], [[post-login-api-mismatch]], [[chatbot-endpoint-mismatch]]): frontend and test-mock share an assumption that was never checked against the documented backend.

## Root Cause Hypothesis

Confidence: high. The frontend's `TicketOwnershipScope` type and the "Created by me" dropdown option were both built using `"created"` as the wire value, but the documented backend contract uses `"mine"`. This is a straightforward enum-value rename, not a structural mismatch — the query parameter name (`scope`), its purpose, and its other two values (`"assigned"`, `"all"`) are already correct.

## Proposed Remediation

**Preferred**: Rename the `"created"` scope value to `"mine"` throughout the frontend:
- `src/types/requests.ts`: `TicketOwnershipScope = "mine" | "assigned" | "all"`.
- `src/pages/TicketListPage.tsx`: both `scopeOptions` arrays' `{ value: "created", ... }` → `{ value: "mine", ... }` (keep the user-facing label "Created by me" — that's correct UX copy, only the wire value is wrong).
- `tests/msw/handlers.ts`: update the mock's `scope === "created"` checks to `scope === "mine"`, matching the corrected contract (same reasoning as the mock updates made in prior bugs this session — otherwise the test would silently start failing for the right reason, or worse, silently keep passing against a still-wrong value if left as `"created"`).

**Alternatives**:
- None meaningful — this is a one-value rename with no architectural trade-off.

**Files likely to change**:
- `src/types/requests.ts`
- `src/pages/TicketListPage.tsx`
- `tests/msw/handlers.ts`
- `tests/integration/ownership-scope-filter.test.tsx` (if it references `"created"` directly anywhere, e.g. in a query-string assertion)

**Tests to add or update**:
- Update/confirm `tests/integration/ownership-scope-filter.test.tsx` exercises the "Created by me" option and asserts the request/filtering behaves correctly with the corrected `scope=mine` value.
- Consider a regression assertion that the actual outgoing request query string contains `scope=mine` (not `scope=created`) when "Created by me" is selected, so a future accidental revert is caught even if the mock is (again) written to match whatever the frontend sends.

## Risks & Considerations

- Low risk — pure rename, no behavior change to anything else in the scoping logic.
- As with the three prior bugs this session, the test mock encoding the same wrong assumption as the frontend meant this shipped without any test catching it. This is now the fourth instance of that exact pattern in one session — worth escalating (beyond just fixing this one instance) as a process/tooling gap: either a periodic manual diff of `src/api/*.ts` + mock handlers against `backend-api-doc.json`, or the previously-recommended runtime schema/enum validation at the request boundary.

## Open Questions

- [NEEDS CLARIFICATION: confirmed above — real backend's behavior on an unrecognized `scope` value (400 vs. silent `all` fallback) is unknown without hitting the live backend, but doesn't change the fix, only how severe the current bug's user-visible impact is.]
