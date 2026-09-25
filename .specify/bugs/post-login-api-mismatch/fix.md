# Bug Fix: Ticket list crashes right after login — `Cannot read properties of undefined (reading 'name')`

- **Slug**: post-login-api-mismatch
- **Fixed**: 2026-09-25
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`Ticket.creator` and `Comment.author` didn't exist on the wire — `backend-api-doc.json` names those fields `createdBy` (a lean `UserSummary: {id, name}`, not a full `User`) and `authorName` (a bare string), respectively. Aligned the frontend's `Ticket`/`Comment` types and every consumer with the documented contract so the ticket list, ticket detail page, and comment list read the fields that actually come back from the backend instead of crashing on `undefined`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/types/ticket.ts` | modified | Added `UserSummary` (`{id, name}`); `Ticket.creator: User` → `Ticket.createdBy: UserSummary`; `Ticket.assignee` retyped `User \| null` → `UserSummary \| null`. |
| `src/types/comment.ts` | modified | `Comment.author: User` → `Comment.authorName: string`; dropped now-unused `User` import. |
| `src/components/TicketList/TicketList.tsx` | modified | `ticket.creator.name` → `ticket.createdBy.name`. |
| `src/pages/TicketDetailPage.tsx` | modified | `ticket.creator.id` → `ticket.createdBy.id` in the `canComment` check. |
| `src/components/CommentList/CommentList.tsx` | modified | `comment.author.name` → `comment.authorName`. |
| `src/components/ReassignControl/ReassignControl.tsx` | modified | `currentAssignee` prop retyped `User \| null` → `UserSummary \| null` (from `types/ticket`), matching the corrected `Ticket.assignee` type. |
| `tests/msw/handlers.ts` | modified | `canView`/`canComment`/list-scope filters and the ticket-create/comment-create handlers now use `createdBy`/`authorName` to match the corrected contract. |
| `tests/integration/*.test.tsx` (8 files: `invalid-transition`, `comment-authorization`, `add-comment`, `search-filter`, `view-edit-navigation`, `update-ticket`, `ownership-scope-filter`, `reassign-ticket`, `ticket-list`, `chatbot-widget`) | modified | Ticket/comment fixture literals updated from `creator`/`author` to `createdBy`/`authorName`. |

## Diff Highlights

```ts
// src/types/ticket.ts
export interface UserSummary {
  id: string;
  name: string;
}

export interface Ticket {
  ...
  assignee: UserSummary | null;
  createdBy: UserSummary;
  ...
}
```

```ts
// src/components/TicketList/TicketList.tsx
<TableCell>{ticket.createdBy.name}</TableCell>
```

```ts
// src/components/CommentList/CommentList.tsx
secondary={`${comment.authorName} — ${new Date(comment.createdAt).toLocaleString()}`}
```

## Tests Added or Updated

No new test cases were added — the assessment's proposed regression coverage ("assert the ticket list renders correctly from a `createdBy`/`assignee`-shaped response") is already exercised by the existing fixtures once corrected: `tests/integration/ticket-list.test.tsx` renders a `createdBy`-shaped ticket and asserts the creator name appears; `tests/integration/ownership-scope-filter.test.tsx` scopes tickets by `createdBy.id`; `tests/integration/add-comment.test.tsx` and `comment-authorization.test.tsx` render `authorName`-shaped comments. These now compile and pass only because they match the real contract, so they serve as the regression guard the assessment asked for.

## Local Verification

- Commands run: `npx tsc --noEmit` → clean, no errors.
- Commands run: `npx vitest run` → 13 test files, 47 tests, all passed. (One unrelated `EPERM: operation not permitted, open '/tmp/.../web/...'` appeared as an "Unhandled Error" from vitest's own IPC/telemetry writer in one run — not from test code, no failing tests, and it didn't reappear on a subsequent run with the "Errors" line absent.)
- Manual checks: none (no real backend/dev server available in this environment).

## Deviations from Assessment

- `src/components/ReassignControl/ReassignControl.tsx` was edited even though it wasn't in the assessment's "Files likely to change" list — its `currentAssignee` prop was typed `User | null` and needed to follow `Ticket.assignee`'s new `UserSummary | null` type for `tsc` to pass. Minimal, mechanical, and a direct consequence of the listed `types/ticket.ts` change.
- The assessment's chatbot-, reassign-endpoint-, and `/api/v1/users`-related audit findings were **not** touched here, per the assessment's own recommendation to file them separately (different failure mode — wrong routes, not field mismatches — and larger remediation scope).

## Follow-ups

- File separate bug assessments for the `reassign` (wrong method/path) and `chatbot` (wrong endpoints + response shape) mismatches identified in `assessment.md`'s audit table — both will fail outright against the real backend.
- Confirm whether `/api/v1/users` (used by `usersApi.listByRole` for the reassignment user picker) is a real, working endpoint just missing from `backend-api-doc.json`, or doesn't exist.
- As noted in the prior bug's fix ([[login-no-redirect]]), consider a runtime schema-validation layer (e.g. zod) at the `request<TResponse>()` boundary in `http.ts` — this is the second contract-mismatch bug in two consecutive assessments, and that layer would catch the whole class going forward instead of one field at a time.
