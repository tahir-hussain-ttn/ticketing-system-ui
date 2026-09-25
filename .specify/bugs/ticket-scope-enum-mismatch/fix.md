# Bug Fix: Ticket list `scope` query param sends wrong enum value

- **Slug**: ticket-scope-enum-mismatch
- **Fixed**: 2026-09-25
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`TicketOwnershipScope` sent `"created"`/`"assigned"`/`"all"` on the wire, but the updated `backend-api-doc.json` confirms the real enum is uppercase `MINE`/`ASSIGNED`/`ALL`, with a `400` returned for any unrecognized value. Renamed the scope values throughout the frontend and mock backend to match, and added a `400` response in the mock for any other value so the contract is enforced in tests going forward.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/types/requests.ts` | modified | `TicketOwnershipScope = "created" \| "assigned" \| "all"` → `"MINE" \| "ASSIGNED" \| "ALL"`. |
| `src/pages/TicketListPage.tsx` | modified | Default `scope` state `"all"` → `"ALL"`; `scopeOptions` values `"created"`/`"assigned"`/`"all"` → `"MINE"`/`"ASSIGNED"`/`"ALL"` (display labels unchanged — "Created by me" etc. were always correct UX copy, only the wire value was wrong). |
| `tests/msw/handlers.ts` | modified | Mock `GET /api/v1/tickets` scope filter now checks `"MINE"`/`"ASSIGNED"` (was `"created"`/`"assigned"`); added an explicit `400` (`validationError`) branch for any scope value that isn't `"MINE"`, `"ASSIGNED"`, `"ALL"`, or absent — matching the backend's documented behavior for an unrecognized value. |

## Diff Highlights

```ts
// src/types/requests.ts
export type TicketOwnershipScope = "MINE" | "ASSIGNED" | "ALL";
```

```ts
// tests/msw/handlers.ts
let filtered = ticketStore;
if (scope === "MINE") {
  filtered = filtered.filter((t) => t.createdBy.id === user.id);
} else if (scope === "ASSIGNED") {
  filtered = filtered.filter((t) => t.assignee?.id === user.id);
} else if (scope !== null && scope !== "ALL") {
  return HttpResponse.json(
    validationError(path, "scope", "Unrecognized scope value"),
    { status: 400 },
  );
} else if (user.role === "GENERAL") {
  filtered = filtered.filter((t) => t.createdBy.id === user.id);
}
```

## Tests Added or Updated

No new test cases were added — `tests/integration/ownership-scope-filter.test.tsx`'s existing tests exercise the scope filter through the UI's option labels ("Created by me", "Assigned to me"), not raw wire values, so they needed no changes and now pass against the corrected `MINE`/`ASSIGNED`/`ALL` contract, serving as the regression guard.

## Local Verification

- Commands run: `npx tsc --noEmit` → clean, no errors.
- Commands run: `npx vitest run` → intermittently reported fewer test files/an "Unhandled Error" (`EPERM: operation not permitted, open '/tmp/.../web/...'`) on a couple of runs — this is vitest's own internal cache/IPC writer hitting a sandbox restriction on the shared `/tmp`, unrelated to any test assertion or this change (same class of noise seen in the prior bug fix this session). Re-ran with `TMPDIR` pointed at the session's scratchpad directory: **13 test files, 48 tests, all passed cleanly.**
- Manual checks: none (no real backend/dev server available in this environment).

## Deviations from Assessment

- The assessment (written before the updated `backend-api-doc.json` and the user's follow-up confirmation) proposed renaming `"created"` → `"mine"` (lowercase), assuming the enum casing followed the doc's prose description ("mine, assigned, or all"). The user's fix-time input, backed by the now-updated doc's explicit `"enum": ["MINE", "ASSIGNED", "ALL"]`, confirmed the real casing is **uppercase**. Renamed all three values to uppercase (`MINE`/`ASSIGNED`/`ALL`), not just the originally-wrong `"created"` one — `"assigned"`/`"all"` were also wrong-cased and would have hit the same `400` the user described, just not yet noticed/reported.
- Added the mock's explicit `400` branch for unrecognized `scope` values — not explicitly listed in the assessment's file/test plan, but a direct, minimal consequence of the user's fix-time confirmation ("in case of unrecognized scope value we get 400 bad request") and needed so the mock actually enforces the same contract the real backend does, rather than silently accepting anything.

## Follow-ups

- Same recurring theme as the prior three bugs this session: a runtime schema/enum validation layer at the `request<TResponse>()` boundary (`src/api/http.ts`) would catch enum-casing drift like this automatically.
- The `ticketsApi.reassign` (wrong method/path) and `usersApi.listByRole` (`/api/v1/users`, undocumented endpoint) mismatches flagged in `post-login-api-mismatch`'s audit remain open and unaddressed.
