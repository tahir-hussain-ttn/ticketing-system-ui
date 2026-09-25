# Contracts: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

This feature does not expose an API of its own — it is a frontend that
**consumes** the backend defined by
`ticketing-system/specs/005-auth-rag-chatbot/spec.md` (sibling repo).

**Contract status**: This repository's `backend-api-doc.json` (OpenAPI
3.1) has **not** been regenerated for backend spec 005 — it still only
reflects spec 001's four endpoints. The table below is therefore derived
from backend spec 005's Functional Requirements, not from an OpenAPI
document, and each row is marked:

- **`FR-sourced`** — shape follows directly from a numbered FR in backend
  spec 005.
- **`Assumed`** — no FR specifies this endpoint; it is a planning
  assumption (see research.md) that MUST be confirmed/corrected against
  the real backend before or during implementation.

`src/types/` is the frontend's typed mirror of the schemas below;
`src/api/` is the only code allowed to call these endpoints (Constitution
Principle V).

## Endpoints consumed

| Method | Path | Status | Used by | Request | Response(s) |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Assumed | US1 (login) | `{ email: string; password: string }` | `200 { user: User; token: string }` \| `401 ApiError` (generic invalid-credentials, backend FR-003) \| `400 ApiError` (missing field, backend FR-004) |
| `POST` | `/api/v1/auth/logout` | Assumed | US1 (logout) | *(none; token in `Authorization` header)* | `204` |
| `GET` | `/api/v1/users?role=SUPPORT` | Assumed | US2 (reassignment control) | query: `role` | `200 User[]` |
| `POST` | `/api/v1/tickets` | FR-sourced (backend FR-009/FR-010) | US2 (create, no assignee sent) | `TicketCreateRequest` *(no `assignee` field — backend auto-assigns)* | `201 TicketResponse` \| `400 ApiError` \| `401 ApiError` |
| `GET` | `/api/v1/tickets` | FR-sourced (backend FR-016/FR-017) | US5 (ownership-scoped list) | query: existing `q?`/`status?`/`page?`/`size?` plus `scope?: "created" \| "assigned" \| "all"` | `200 TicketPage` \| `401 ApiError` |
| `GET` | `/api/v1/tickets/{ticketId}` | FR-sourced (backend FR-037) | US2/US4/US5 (view detail) | path: `ticketId` | `200 TicketDetailResponse` \| `401 ApiError` \| `403 ApiError` (not creator/assignee/SUPPORT/ADMIN) \| `404 ApiError` |
| `PATCH` | `/api/v1/tickets/{ticketId}` | Unchanged from spec 001, minus `assignee` | US2 (edit title/description/priority) | `TicketUpdateRequest` *(no `assignee` field)* | `200 TicketResponse` \| `400/401/403/404/409 ApiError` |
| `POST` | `/api/v1/tickets/{ticketId}/reassign` | Assumed | US2 (`ADMIN` reassignment) | `{ assigneeId: string }` | `200 TicketResponse` \| `400/401/403/404 ApiError` |
| `GET` | `/api/v1/tickets/{ticketId}/comments` | Unchanged from spec 001 | US4 (comment history) | path: `ticketId`, query: `page?`, `size?` | `200 CommentPage` \| `401/403/404 ApiError` |
| `POST` | `/api/v1/tickets/{ticketId}/comments` | FR-sourced (backend FR-014/FR-015) | US4 (add comment) | `CommentCreateRequest` | `201 CommentResponse` \| `400/401/403/404 ApiError` (`403` when caller is neither creator nor assignee) |
| `POST` | `/api/v1/chatbot/conversations/{conversationId?}/queries` | Assumed | US3 (chatbot query) | path: optional `conversationId` (omitted starts a new conversation, backend FR-036/FR-019); body: `{ query: string }` | `200 ChatbotQueryResponse` \| `400 ApiError` (empty query, backend FR-022) \| `401 ApiError` \| `503 ApiError` (retrieval/LLM unavailable, backend FR-030) |

`ChatbotQueryResponse` (assumed shape):

```text
{
  conversationId: string;
  turnId: string;
  status: "answered" | "no-match";
  response: string | null;        // present only when status = "answered"
  sourceTickets: string[];        // plain-text references, e.g. "Ticket #4821"
}
```

## Frontend-side contract notes

- Every request other than `POST /api/v1/auth/login` carries `Authorization:
  Bearer <token>` (see research.md, "Session/token handling"); `http.ts`
  attaches it centrally, no component or hook sets it directly.
- A `401` from any endpoint (expired/missing session) is treated as
  sign-out and redirects to `/login` (spec.md FR-006) — `http.ts` raises
  this as a distinct condition from an ordinary `HttpError`, and
  `AuthContext` is the only place that reacts to it.
- A `403` is a normal, displayable authorization rejection (spec.md
  FR-023, FR-026) — it is shown as a "not permitted" message, not treated
  as sign-out.
- `POST .../tickets` and `PATCH .../tickets/{id}` MUST NOT include an
  `assignee` field in the request body at all (not even `null`) — the
  reassignment endpoint is the only way this UI changes assignment, per
  spec.md FR-007/FR-009.
- `GET /api/v1/tickets` combines `q`, `status`, and the new `scope` param
  independently and combinably (spec.md FR-025); when `scope` is omitted,
  spec 001's original "list all" behavior applies (backend spec 005
  Assumptions).
- The chatbot query endpoint's path takes an optional `conversationId`:
  the frontend omits it for the first query of a session/after a
  conversation has ended (`ChatbotConversation.endedAt !== null`), and
  supplies the current conversation's ID for every subsequent query in the
  same conversation (spec.md FR-019, User Story 3 Scenario 8).
- `sourceTickets` in the chatbot response are rendered as plain text only
  — never as links to `/tickets/{id}` — per Clarifications (2026-09-24).

## Client-side route contract

| Route | Page | Notes |
|---|---|---|
| `/login` | `LoginPage` | Reachable without a session; the only route not wrapped by `ProtectedRoute` |
| `/` | `TicketListPage` | Protected; ownership-scope selector, creator column added |
| `/tickets/new` | `TicketCreatePage` | Protected; no assignee field |
| `/tickets/:ticketId` | `TicketDetailPage` | Protected; shows assignee/creator, `ReassignControl` (`ADMIN` only), gated comment form, "not permitted" state on `403` |
| `/tickets/:ticketId/edit` | `TicketEditPage` | Protected; no assignee field |

The chatbot widget is not a route — it is mounted once in `App.tsx`
outside `<RouterProvider>` so it persists across all of the above (spec.md
FR-013/FR-013a, research.md).

`ProtectedRoute` redirects to `/login` (preserving the originally-requested
path is not required by spec.md — landing on `/` after login is
sufficient, matching backend spec 005 User Story 1's own framing).

## Mock contract for tests

`tests/msw/handlers.ts` is extended with handlers for every row above
(including the `Assumed` ones, since tests need something to mock
regardless of contract status), covering both success and each documented
error status (`400`, `401`, `403`, `404`, `409`, `503`) so integration
tests can exercise accept and reject paths without a live backend, exactly
as spec 001's tests already do for the original four endpoints.
