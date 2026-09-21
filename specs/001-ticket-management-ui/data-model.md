# Data Model: Support Ticket Management UI

All types below are the frontend's typed mirror of the schemas in
`backend-api-doc.json` (source of truth for shape and validation). The
backend remains authoritative; these types exist so `src/api/` and
`src/hooks/` never construct or accept untyped/`any` data
(Constitution Principle II & V).

## Ticket

Represents a single unit of support work.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Server-assigned, immutable |
| `title` | `string` | Required on create; backend allows `0`–`200` chars; UI additionally treats an empty title as invalid client-side (FR-001 acceptance scenario 2) even though the backend schema permits `minLength: 0` — a stricter UX guard on top of, not instead of, backend validation |
| `description` | `string` | Required on create, `minLength: 1` |
| `priority` | `Priority` enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` (per Clarifications, 2026-09-21) |
| `status` | `Status` enum | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` \| `CLOSED` \| `CANCELLED`; changed only via the transition endpoint, never via the update endpoint |
| `assignee` | `string \| undefined` | Selected from the static known-users list (`src/config/assignees.ts`); may be absent/unassigned |
| `createdAt` | `string` (ISO date-time) | Server-assigned |
| `updatedAt` | `string` (ISO date-time) | Server-assigned |

### Status lifecycle (state machine)

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
OPEN → CANCELLED
IN_PROGRESS → CANCELLED
```

`CLOSED` and `CANCELLED` are terminal — no outbound transitions. All other
transitions (e.g. `CLOSED → OPEN`, `RESOLVED → OPEN`, `CANCELLED → OPEN`)
are invalid and MUST be rejected by the backend (`409`); the UI never
applies a status change locally before the backend confirms it
(Constitution Principle III).

## Comment

A timestamped note attached to exactly one ticket. Immutable once created
(no edit/delete in this feature). No author field — this slice has no
user identity/authentication (per Clarifications, 2026-09-21).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Server-assigned |
| `ticketId` | `string` (UUID) | Parent ticket |
| `content` | `string` | Required, `minLength: 1` |
| `createdAt` | `string` (ISO date-time) | Server-assigned; comments are displayed in chronological (creation) order |

## CommentPage (comment-list response envelope)

Returned by `GET /api/v1/tickets/{ticketId}/comments` (oldest-to-newest).

| Field | Type | Notes |
|---|---|---|
| `content` | `Comment[]` | The current page of comments |
| `page` | `number` | Zero-based current page index |
| `size` | `number` | Page size (default `20`) |
| `totalElements` | `number` | Total comments on this ticket |
| `totalPages` | `number` | Drives the "load more"/pagination control (FR-006a) |

## ApiError / ApiFieldError

Returned by the backend on `400`/`404`/`409` responses; drives all
user-facing error messaging (Constitution Principle IV, FR-012).

| Field | Type | Notes |
|---|---|---|
| `code` | `string` | Machine-readable error code (not shown raw to the user) |
| `message` | `string` | Human-readable summary; shown for non-field-specific errors (e.g. 404, 409) |
| `timestamp` | `string` (ISO date-time) | Not shown in UI; useful for support/debugging only |
| `path` | `string` | Not shown in UI |
| `fieldErrors` | `ApiFieldError[]` | Present on `400` validation failures; each entry maps to one form field |

`ApiFieldError`: `{ field: string; message: string }` — `field` is matched
against the form's field names to render inline, per-field errors
(`FormHelperText`); if `field` does not match a known form field, its
`message` is shown in the form's general error area instead of being
dropped silently.

## TicketPage (list response envelope)

| Field | Type | Notes |
|---|---|---|
| `content` | `Ticket[]` | The current page of tickets |
| `page` | `number` | Zero-based current page index |
| `size` | `number` | Page size (default `20`) |
| `totalElements` | `number` | Total tickets matching the current `q`/`status` filters |
| `totalPages` | `number` | Drives the pagination control |

## Relationships

- `Ticket` 1 — N `Comment` (a ticket has zero or more comments). Fetched
  as their own paginated resource via
  `GET /api/v1/tickets/{id}/comments` → `CommentPage`, independent of the
  ticket-detail fetch. `TicketDetailResponse` (`GET /api/v1/tickets/{id}`)
  still has an embedded, unpaginated `comments: Comment[]` field, but the
  UI does not read it — it is redundant with, and can drift from, the
  dedicated paginated endpoint (see research.md, "Comment listing").
- `Ticket.assignee` references an entry in the static known-users list
  (`src/config/assignees.ts`) by display value; there is no backend
  `User` entity in this feature's scope (see `research.md`).

## Validation rules summary (client-side, mirroring backend)

- Create ticket: `title` non-empty (UX guard; see note above),
  `description` non-empty, `priority` one of the four enum values required.
- Update ticket: any subset of `title`/`description`/`priority`/`assignee`;
  never includes `status`.
- Add comment: `content` non-empty.
- Status transition: request body's `status` MUST be one of the five enum
  values; the UI only *offers* the valid next statuses per the lifecycle
  above, but always defers to the backend's accept/reject response.
