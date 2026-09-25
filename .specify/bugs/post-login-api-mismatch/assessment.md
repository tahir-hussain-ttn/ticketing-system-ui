# Bug Assessment: Ticket list crashes right after login — `Cannot read properties of undefined (reading 'name')`

- **Slug**: post-login-api-mismatch
- **Created**: 2026-09-25
- **Source**: pasted text + pasted file `backend-api-doc.json` (also present on disk at repo root)
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim)

> Now I am getting a different error. As soon as I am redirected to the home page after login I get the below error. Can you verify each and every API call is binding the request and response correctly as per the api documentation in @backend-api-doc.json
>
> ```
> Uncaught TypeError: Cannot read properties of undefined (reading 'name')
>     at TicketList.tsx:56:40
>     at Array.map (<anonymous>)
>     at TicketList (TicketList.tsx:46:18)
> ```

## Symptom

After a successful login (see resolved bug [[login-no-redirect]]), the app navigates to `/` and renders the ticket list. It immediately throws an uncaught `TypeError` while rendering each ticket row, crashing the ticket list (and, since it's an uncaught render error with no error boundary around it, likely the whole page). Expected: the ticket list renders each ticket's title, status, priority, assignee, and creator without error.

## Reproduction

1. Log in successfully (lands on `/`).
2. `TicketListPage` fetches `GET /api/v1/tickets` and passes the result to `<TicketList tickets={...} />`.
3. `TicketList` maps over `tickets` and reads `ticket.creator.name` for each row (`TicketList.tsx:56`).
4. Crash: `ticket.creator` is `undefined` for every ticket returned by the real backend.

## Suspected Code Paths

- `src/components/TicketList/TicketList.tsx:56` — `<TableCell>{ticket.creator.name}</TableCell>` — crashes because `ticket.creator` is `undefined`.
- `src/types/ticket.ts:23-33` — frontend `Ticket` interface declares `creator: User` (full `User`, with `role`), but `backend-api-doc.json`'s `TicketResponse`/`TicketDetailResponse` schemas (lines 813-818, 1100-1105) have no `creator` field at all — the equivalent field is named **`createdBy`**, and its type is `UserSummary` (`{ id, name }` only — no `role`, no `email`).
- `src/pages/TicketDetailPage.tsx:40` — `user.id === ticket.creator.id || user.id === ticket.assignee?.id` — same `creator` field will be `undefined` here too, so `ticket.creator.id` will throw on the ticket detail page as well (would only be masked today because the ticket-list crash happens first).
- `src/types/ticket.ts:29` — `assignee: User | null` — backend's `assignee` field is correctly named, but its type is `UserSummary` (`{id, name}`), not full `User`; harmless in practice since nothing currently reads `.role`/`.email` off `ticket.assignee`, but it's a type-accuracy issue worth fixing alongside `creator`.
- `src/components/CommentList/CommentList.tsx:30` — `comment.author.name` — same bug pattern: `src/types/comment.ts:3-8`'s `Comment.author: User` doesn't exist on the wire. `backend-api-doc.json`'s `CommentResponse` schema (lines 906-928) only has a flat **`authorName: string`**, no nested `author` object at all. This will crash the ticket-detail page's comment list the same way, once a user navigates there.

## Root Cause Hypothesis

Confidence: high. The frontend's `Ticket`/`Comment` TypeScript types were written against an assumed response shape (`creator`/`author` as full nested `User` objects) that doesn't match the actual backend contract in `backend-api-doc.json`. The backend returns lean summaries (`createdBy`/`assignee` as `{id, name}` `UserSummary`, and `authorName` as a bare string) under different field names. Because `http.ts`'s `request()` does a blind type-assertion cast (`return (await response.json()) as TResponse`, `src/api/http.ts:74`) with no runtime validation, this mismatch isn't caught until a component actually dereferences the missing field, producing the exact crash reported: `ticket.creator` is `undefined`, so `.name` throws.

This is the same underlying weakness identified during the prior bug ([[login-no-redirect]]): the codebase was built against assumed response shapes rather than the documented backend contract, and nothing validates responses at the network boundary.

## Additional API-Contract Mismatches Found (full audit, as requested)

Auditing every call in `src/api/*.ts` against `backend-api-doc.json`:

| Frontend call | Backend doc | Match? |
|---|---|---|
| `authApi.login` → `POST /api/v1/auth/login` | `POST /api/v1/auth/login` | ✅ path/method (already fixed in [[login-no-redirect]]) |
| `authApi.logout` → `POST /api/v1/auth/logout` | `POST /api/v1/auth/logout` | ✅ |
| `ticketsApi.list` → `GET /api/v1/tickets` (q, status, scope, page, size) | same | ✅ path/method/params; ❌ response — `creator`/`createdBy` mismatch above |
| `ticketsApi.create` → `POST /api/v1/tickets` | same | ✅ path/method/body; ❌ response — same `creator`/`createdBy` mismatch |
| `ticketsApi.getById` → `GET /api/v1/tickets/{id}` | same | ✅ path/method; ❌ response — same mismatch, plus nested `comments[].author` mismatch |
| `ticketsApi.update` → `PATCH /api/v1/tickets/{id}` | same | ✅ path/method/body; ❌ response — same mismatch |
| `ticketsApi.transition` → `POST /api/v1/tickets/{id}/transitions` | same | ✅ |
| `ticketsApi.reassign` → **`POST /api/v1/tickets/{id}/reassign`** | **`PATCH /api/v1/tickets/{id}/assignee`** | ❌ **wrong HTTP method AND wrong path** — will 404/405 against the real backend, not just a body/field issue |
| `commentsApi.list` → `GET /api/v1/tickets/{id}/comments` | same | ✅ path/method/params; response shape OK except `authorName` vs `author` (above) |
| `commentsApi.addComment` → `POST /api/v1/tickets/{id}/comments` | same | ✅ path/method/body |
| `usersApi.listByRole` → `GET /api/v1/users?role=...` | **not present in `backend-api-doc.json` at all** | ❌ endpoint isn't documented/doesn't exist per the doc |
| `chatbotApi.submitQuery` → `POST /api/v1/chatbot/conversations/{id}/queries` or `POST /api/v1/chatbot/conversations/queries` | **`POST /api/v1/chatbot/messages`** (single endpoint, `conversationId` optional in body) plus a separate **`POST /api/v1/chatbot/conversations/{id}/end`** | ❌ **entirely different endpoint shape** — wrong paths, and response schema differs field-for-field: frontend expects `{conversationId, turnId, status, response, sourceTickets}`, backend sends `{conversationId, responseText, sourceTicketIds, confidentMatch}` |

The reassign and chatbot mismatches are **not just field renames** — they're wrong routes/request shapes that will fail outright (404/405, or 400 on an unrecognized body) against the real backend, not silently produce `undefined`. They reproduce a different failure mode than the reported crash and are large enough (chatbot in particular needs a response-shape and conversation-flow redesign, not a field rename) that fixing them here would blow past "keep the change minimal." Recommend a **separate bug assessment** for each once reproduced against the real backend, rather than folding them into this fix.

## Proposed Remediation

**Preferred**: Fix the reported crash and its sibling (same root cause, same fix shape) by aligning the frontend's ticket/comment types and mapping with the documented contract:
- Rename `Ticket.creator` → `Ticket.createdBy` (or keep the frontend name `creator` and map the field during deserialization — renaming to match the wire field directly is simpler and avoids a translation layer) throughout `src/types/ticket.ts`, `src/components/TicketList/TicketList.tsx`, `src/pages/TicketDetailPage.tsx`, and any other consumer.
- Change `Ticket.assignee` and the renamed creator field's type from `User` to a new `UserSummary` type (`{id: string; name: string}`), since that's all the backend ever sends for these two fields.
- Change `Comment.author: User` to `Comment.authorName: string` in `src/types/comment.ts`, and update `src/components/CommentList/CommentList.tsx:30` to read `comment.authorName` directly instead of `comment.author.name`.
- Add a small defensive check (or at minimum, confirm via tests) that these fields render sensibly if ever absent, so a future contract drift degrades gracefully instead of crashing the whole list.

**Alternatives**:
- Add a runtime schema-validation layer (e.g. zod) at the `request<TResponse>()` boundary in `http.ts`, validating against the documented schemas so any future drift fails loudly with a clear error instead of an opaque `Cannot read properties of undefined`. Higher effort, but addresses the whole class of bug (this is the second contract-mismatch bug found in two consecutive assessments) rather than one instance of it.

**Files likely to change**:
- `src/types/ticket.ts`
- `src/types/comment.ts`
- `src/components/TicketList/TicketList.tsx`
- `src/components/CommentList/CommentList.tsx`
- `src/pages/TicketDetailPage.tsx`
- `tests/msw/handlers.ts` (mock `Ticket`/`Comment`/`TicketDetail` responses currently also use `creator`/`author` — need to match the corrected, doc-aligned shape)
- Any other test fixtures constructing `Ticket`/`Comment`/`TicketDetail` objects (e.g. `tests/integration/*.test.tsx` ticket seed data)

**Tests to add or update**:
- Update existing ticket-list/ticket-detail/comment integration tests' MSW fixtures to the corrected `createdBy`/`assignee` (`UserSummary`) and `authorName` shapes, confirming they still render without crashing.
- Add a regression test asserting the ticket list renders a ticket's creator/assignee name correctly from a `createdBy`/`assignee`-shaped mock response (not a `creator`-shaped one), so this can't silently regress.

## Risks & Considerations

- This is at least the second bug in a row caused by the frontend's types not matching the actual backend contract — worth flagging to the team as a systemic risk, not just two one-off bugs. The zod-validation alternative above would catch the whole class going forward.
- The `reassign` and `chatbot` mismatches found during this audit are real and will fail against the real backend, but are out of scope for this fix (different failure mode, larger surface area). Flagging them here per the user's explicit ask to check every call, but recommending separate assessments so this fix stays minimal and reviewable.
- `usersApi.listByRole` hits `/api/v1/users` which isn't in the provided `backend-api-doc.json` at all — could mean the doc is incomplete (endpoint exists but wasn't documented) or the endpoint genuinely doesn't exist. Not fixed here; flagged as an open question.

## Open Questions

- [NEEDS CLARIFICATION: is `/api/v1/users` a real, working backend endpoint that was simply omitted from `backend-api-doc.json`, or does it not exist? Affects the "reassign" flow's user picker and any other role-filtered user list in the UI.]
- [NEEDS CLARIFICATION: should the `reassign` and `chatbot` endpoint/response mismatches found in this audit be filed as separate bugs now, or addressed together with this one? Recommendation: separate, given the difference in failure mode and remediation size — but deferring to the user's preference.]
