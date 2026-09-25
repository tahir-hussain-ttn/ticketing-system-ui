# Data Model: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

Types below extend spec 001's data model
(`specs/001-ticket-management-ui/data-model.md`) with the entities and
field changes backend spec 005 introduces. Where a type is unchanged from
spec 001, it is not repeated here. The backend remains authoritative; these
are the frontend's typed mirror (Constitution II & V), derived from backend
spec 005's Functional Requirements and flagged where the exact wire shape
is an assumption pending `backend-api-doc.json` regeneration (see
research.md, "Backend contract currency").

## User

New entity — a person who can log in.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Server-assigned, immutable |
| `name` | `string` | Displayed as assignee/creator/comment-author name |
| `role` | `Role` | `SUPPORT` \| `GENERAL` \| `ADMIN` |

`Role` is a string union type, mirrored from backend spec 005's Key
Entities (`User.role`). No `email`/`password` field is modeled on the
frontend — those exist only in the login request, never in a stored/
displayed `User`.

## AuthSession

New, frontend-only concept (not a backend entity) — the signed-in state
held by `AuthContext` / `src/auth/session.ts`.

| Field | Type | Notes |
|---|---|---|
| `user` | `User` | The signed-in user's identity/role |
| `token` | `string` | Opaque bearer token from login; never rendered, never logged |

## Ticket *(extends spec 001)*

| Field | Type | Change from spec 001 |
|---|---|---|
| `assignee` | `User \| null` | Was `string \| undefined`. Now a `User` reference (or `null` if unassigned), never caller-set on create (FR-007) |
| `creator` | `User` | **New.** The user who created the ticket; used for ownership scoping (FR-024) and view authorization (FR-026) |
| *(all other fields unchanged)* | | `title`, `description`, `priority`, `status`, `createdAt`, `updatedAt` — see spec 001 data-model.md |

`TicketCreateRequest` (spec 001) drops any `assignee` field entirely — the
frontend never sends one (FR-007); the backend determines it.

## Comment *(extends spec 001)*

| Field | Type | Change from spec 001 |
|---|---|---|
| `author` | `User` | **New.** Was author-less in spec 001; now every comment carries the `User` who created it (FR-021) |
| *(all other fields unchanged)* | | `id`, `ticketId`, `content`, `createdAt` |

## ChatbotConversation

New entity — the signed-in user's ongoing exchange with the chatbot widget,
held client-side in `ChatbotContext` (see research.md).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Backend-assigned on first query of a new conversation |
| `turns` | `ChatbotTurn[]` | Ordered, oldest first |
| `endedAt` | `string \| null` | Set once the conversation ends (explicit end action or 30-minute inactivity, per backend spec 005 FR-036); a new query after this starts a new `ChatbotConversation` (FR-019) |

## ChatbotTurn

One query/response pair within a conversation.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Client-generated (e.g. UUID) for React list keys; not necessarily the backend's own turn ID |
| `query` | `string` | The free-text text the user submitted |
| `status` | `"pending" \| "answered" \| "no-match" \| "error"` | Drives which of response/no-match-message/error-message is rendered |
| `response` | `string \| null` | The reworded, customer-safe resolution text (FR-020); `null` unless `status === "answered"` |
| `sourceTickets` | `string[]` | Plain-text ticket references (e.g. `"Ticket #4821"`) cited alongside an `"answered"` response (FR-015); never rendered as links |
| `timestamp` | `string` (ISO date-time) | When the query was submitted |

## Role-gated UI derivations (not separate entities, but referenced by multiple components)

- **Can reassign**: `session.user.role === "ADMIN"` (FR-010/FR-012).
- **Can comment on a ticket**: `session.user.id === ticket.creator.id \|\|
  session.user.id === ticket.assignee?.id` (FR-022).
- **Ownership-scope options offered**: `["created by me", "assigned to
  me", "all"]` for `SUPPORT`/`ADMIN`; `["created by me", "all"]` for
  `GENERAL` (FR-024a).

These derivations are computed client-side purely to decide what to
*display*; every underlying action (reassign, comment, view) still goes to
the backend for authorization, per Constitution III — the frontend check is
a usability aid, not the enforcement point.

## ApiError / ApiFieldError

Unchanged from spec 001 (`specs/001-ticket-management-ui/data-model.md`) —
also used for login (`400`/`401`), reassignment, and chatbot-query error
responses.

## Relationships

- `Ticket.creator` and `Ticket.assignee` both reference `User` (spec 001's
  data model had no `User` entity at all).
- `Comment.author` references `User`.
- `ChatbotTurn.sourceTickets` are plain-text references, not `Ticket`
  foreign keys the frontend resolves or links — per Clarifications
  (2026-09-24), they are never clickable, so no client-side join to a
  `Ticket` record is needed or performed.

## Validation rules summary (client-side, mirroring backend)

- Login: `email` and `password` both required before submission is
  attempted (FR-004); the backend's generic invalid-credentials response
  (FR-003) is never pre-validated client-side beyond presence.
- Ticket create: unchanged from spec 001 minus `assignee` (never sent).
- Ticket edit: unchanged from spec 001 minus `assignee` (never sent; only
  `ReassignControl`, not the edit form, can change it).
- Reassignment: request always names an existing `SUPPORT`-role `User.id`
  from the `useSupportUsers` list — the control never allows submitting a
  non-`SUPPORT` user or ID not present in that list.
- Chatbot query: non-empty, non-whitespace-only text required before
  submission (FR-014).
