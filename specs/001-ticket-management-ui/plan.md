# Implementation Plan: Support Ticket Management UI

**Branch**: `001-ticket-management-ui` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ticket-management-ui/spec.md`

## Summary

A single-page React + TypeScript application that lets support agents
create, list, view, update, comment on, search, and filter tickets, and
drive tickets through their status lifecycle — with the existing backend
(documented in `backend-api-doc.json`, OpenAPI 3.1) as the sole source of
truth for persistence, field validation, and status-transition legality.
Viewing a ticket (read-only, with comments and status transitions) and
editing its fields are separate pages/routes, not one combined page;
creating or saving an edit both redirect to the ticket's read-only detail
page, and every page shows breadcrumb navigation back to its ancestors.
The frontend consumes seven existing endpoints (list, create, get-by-id,
update, transition, list-comments (paginated), add-comment) through one
typed API client, using Material UI for the mandated Material Design
theme, TanStack Query for data fetching/caching/error state, and React
Router for list/detail/edit/create navigation.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict mode), React 18.3

**Primary Dependencies**: React 18, React DOM, MUI (`@mui/material`,
`@mui/icons-material`) for the mandated Material Design UI, React Router
v6 for routing, TanStack Query v5 for server-state fetching/caching, native
`fetch` (no axios) wrapped in a small typed client for HTTP calls

**Storage**: N/A — this repository is frontend-only; all ticket/comment
persistence lives behind the existing backend API described in
`backend-api-doc.json` (base `http://localhost:8080`, paths under
`/api/v1`)

**Testing**: Vitest + React Testing Library for component/hook tests, MSW
(Mock Service Worker) to mock the documented backend contract for
success/error-path integration tests without a live backend

**Target Platform**: Evergreen desktop web browsers (Chrome/Edge/Firefox/
Safari, latest 2 versions), served as a static SPA build (Vite)

**Project Type**: Web frontend — single project (this repo contains no
backend code; the backend is an existing external service)

**Performance Goals**: Ticket list (up to ~200 tickets/page) renders within
1s on a typical broadband connection; UI feedback (button/state change) for
user-initiated actions within 100ms of the interaction, independent of
network latency

**Constraints**: Must consume the backend exactly as documented in
`backend-api-doc.json` — status changes only via
`POST /api/v1/tickets/{id}/transitions` (the `PATCH` update endpoint never
accepts `status`); both the ticket list and a ticket's comment list are
paginated by the backend (`page`/`size` query params, default size 20);
`TicketDetailResponse` still embeds a `comments` array, but the comment
list shown in the UI is sourced from the dedicated, paginated
`GET /api/v1/tickets/{id}/comments` endpoint, not that embedded array;
every write MUST surface the backend's `ApiError` (`fieldErrors`,
`message`) rather than assuming success; comments have no author field —
this slice has no user identity/authentication; viewing a ticket
(`/tickets/:id`) and editing it (`/tickets/:id/edit`) are separate routes
— the view route never renders editable fields, and the edit route
navigates back to the view route on a successful save (spec.md FR-003,
FR-004, FR-019)

**Scale/Scope**: 7 backend endpoints, 4 user stories (create+list,
view+update+transition, comment, search+filter), single user role, no
authentication in this slice

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Functional Components Only | All views/components planned as functional components with hooks (`useState`/`useReducer`/`useEffect`, custom hooks for data access) | PASS |
| II. TypeScript Strict Typing | `tsconfig.json` strict mode; domain types (`Ticket`, `Comment`, `Priority`, `Status`, `ApiError`) defined once in `src/types/`, mirrored 1:1 from `backend-api-doc.json` schemas | PASS |
| III. Backend-Driven State Machine Trust (NON-NEGOTIABLE) | UI only *offers* transitions consistent with the state machine as a usability aid; every transition is a `POST .../transitions` call; `409` rejections are surfaced verbatim, never swallowed or retried silently | PASS |
| IV. Meaningful Error Feedback | TanStack Query's per-request loading/error/success state drives distinct list/detail loading, empty, and error UI; `ApiError.fieldErrors` mapped to per-field `FormHelperText` in forms | PASS |
| V. Typed API Contract Layer | Single `src/api/` module (`http.ts` + per-resource functions) is the only place `fetch` is called; every function's request/response types match `src/types/` | PASS |
| VI. No Secrets in Client Code | Backend base URL read from `VITE_API_BASE_URL` env var; `.env*.local` git-ignored; no credentials needed for this slice (no auth) | PASS |
| Stack: Material Design mandated | MUI selected as the Material Design implementation | PASS |
| Stack: Accessibility | MUI form controls carry labels by default; custom interactive elements (status-transition buttons) get explicit `aria-label`s; MUI `Breadcrumbs` carries `aria-label="breadcrumb"` and a navigable `<nav>` landmark by default | PASS |
| Dev Workflow: new-dependency justification | See `research.md` Decisions — each added dependency (MUI, React Router, TanStack Query, MSW, Vite) is justified against the constitution's "no unjustified dependency" gate | PASS |

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/001-ticket-management-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── api/                  # Typed API client — the only layer that calls fetch()
│   ├── http.ts           # fetch wrapper: base URL, JSON handling, ApiError parsing
│   ├── ticketsApi.ts     # list/create/getById/update/transition
│   └── commentsApi.ts    # list (paginated)/addComment
├── types/                # Domain types mirrored from backend-api-doc.json
│   ├── ticket.ts          # Ticket, Priority, Status, TicketPage, TicketDetail
│   ├── comment.ts         # Comment, CommentPage
│   └── apiError.ts        # ApiError, ApiFieldError
├── hooks/                 # TanStack Query hooks wrapping api/
│   ├── useTickets.ts       # list + search/filter/pagination params
│   ├── useTicket.ts        # get-by-id (ticket fields only)
│   ├── useComments.ts      # paginated comment list for a ticket
│   ├── useCreateTicket.ts
│   ├── useUpdateTicket.ts
│   ├── useTransitionTicket.ts
│   └── useAddComment.ts
├── components/             # Presentational + form components
│   ├── TicketList/
│   ├── TicketForm/          # shared by create + edit pages
│   ├── StatusBadge/
│   ├── PriorityBadge/
│   ├── StatusTransitionMenu/ # offers only valid next-statuses
│   ├── CommentList/
│   ├── CommentForm/
│   └── Breadcrumbs/          # generic {label, to?}[] trail, used by every page
├── pages/                   # Route-level containers
│   ├── TicketListPage.tsx
│   ├── TicketCreatePage.tsx
│   ├── TicketDetailPage.tsx  # read-only: fields, StatusTransitionMenu, comments, "Edit" link
│   └── TicketEditPage.tsx    # TicketForm only; navigates to TicketDetailPage on save
├── routes/
│   └── router.tsx            # "/", "/tickets/new", "/tickets/:ticketId", "/tickets/:ticketId/edit"
├── theme/
│   └── muiTheme.ts
├── config/
│   ├── env.ts               # reads VITE_API_BASE_URL
│   └── assignees.ts         # static known-users list (see research.md)
├── App.tsx
└── main.tsx

tests/
├── unit/                    # component/hook unit tests
├── integration/              # page-level flows against MSW-mocked API
│   ├── create-ticket.test.tsx
│   ├── update-ticket.test.tsx
│   ├── invalid-transition.test.tsx
│   ├── add-comment.test.tsx
│   └── search-filter.test.tsx
└── msw/
    ├── handlers.ts            # mocked handlers mirroring backend-api-doc.json
    └── server.ts
```

**Structure Decision**: Single frontend project at the repository root
(this repo has no backend code — the backend is an existing external
service consumed via the documented API). No `frontend/`/`backend/` split
is used since there is nothing else in this repository to split from.

## Complexity Tracking

*No constitution violations identified — table intentionally left empty.*
