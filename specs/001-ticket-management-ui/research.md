# Research: Support Ticket Management UI

All Technical Context items were resolvable from the constitution, the
feature spec, and `backend-api-doc.json` — no unresolved
`NEEDS CLARIFICATION` markers remain.

## Decision: Build tooling — Vite

**Rationale**: Official, actively maintained React+TS template; fast dev
server and build; integrates natively with Vitest (same config, no second
toolchain).

**Alternatives considered**: Create React App (deprecated, unmaintained);
Next.js (adds SSR/server-routing capability this internal SPA, which only
talks to an existing external REST API, does not need).

## Decision: UI component library — MUI (Material UI) v6

**Rationale**: Constitution's Frontend Technology Stack section mandates
Material Design strictly. MUI is the reference Material Design
implementation for React and ships accessible components (labels, keyboard
nav, focus management) out of the box, supporting Principle IV and the
constitution's accessibility clause with minimal custom work.

**Alternatives considered**: Hand-built Material-styled components
(rejected — reinvents accessibility and theming work MUI already solves);
Ant Design / Chakra UI (rejected — not Material Design, violates the
constitution's UX mandate).

## Decision: Server-state management — TanStack Query v5

**Rationale**: Every ticket/comment read and write needs distinct loading,
success, and error states (Principle IV) and needs to reflect changes
immediately without a full page reload (FR-014). TanStack Query provides
per-request status flags and mutation-driven cache invalidation
out of the box, avoiding hand-rolled `useState`/`useEffect` duplication
across six API operations.

**Alternatives considered**: Plain `useEffect`/`useState` per hook
(rejected — duplicates loading/error/race-condition handling six times,
higher bug risk); SWR (comparable, but TanStack Query's mutation +
invalidation API is a closer fit for this feature's write-heavy flows).

## Decision: HTTP client — native `fetch`, no axios

**Rationale**: The backend API surface is plain JSON REST with no need for
interceptors, request cancellation beyond what `fetch`/`AbortController`
already provides, or upload progress. A small typed wrapper around `fetch`
satisfies Principle V (single typed API client) without an unjustified
extra dependency, per the constitution's Development Workflow gate.

**Alternatives considered**: axios (rejected — no capability gap it closes
for this API surface; would be an unjustified dependency).

## Decision: Routing — React Router v6

**Rationale**: List, create, and detail views need distinct, bookmarkable
URLs (e.g. `/tickets/:id`) so a specific ticket can be linked to directly
and so each user story (per the spec's "Independent Test" clauses) can be
exercised and tested in isolation.

**Alternatives considered**: Single-page state-only view switching
(rejected — no deep links to a specific ticket, harder to test
independently, worse back-button behavior).

## Decision: Testing stack — Vitest + React Testing Library + MSW

**Rationale**: Vitest shares Vite's config and transform pipeline (no
second bundler). React Testing Library encourages asserting on
user-visible behavior, which maps directly onto the spec's Given/When/Then
acceptance scenarios. MSW mocks the documented OpenAPI contract at the
network layer, so both success and backend-rejection paths (400 validation,
404 not found, 409 invalid transition/conflict) can be tested per the
constitution's Development Workflow gate without a live backend.

**Alternatives considered**: Jest (rejected — needs extra config on top of
Vite for no material benefit over Vitest); hitting a real backend instance
in tests (rejected — makes tests non-hermetic and unable to reliably
reproduce 409/404 conditions on demand).

## Decision: Assignee list source — static frontend-owned list

**Context**: The clarified spec decision (Clarifications, 2026-09-21)
requires assignee selection via a dropdown from a fixed list of known
users, not free text. `backend-api-doc.json`'s `assignee` field on
`TicketCreateRequest`/`TicketUpdateRequest`/`TicketResponse` is a plain
`string` with no enum and no `/users`-style listing endpoint.

**Decision**: Maintain a small, static list of known users in
`src/config/assignees.ts`, used to populate the assignee dropdown on both
create and update forms. The selected value is sent as a plain string,
matching the backend's `assignee: string` field exactly.

**Rationale**: Satisfies the clarified dropdown requirement using only
what the backend already accepts; avoids inventing a backend endpoint that
does not exist and is out of scope for this frontend-only feature.

**Alternatives considered**: Free-text assignee entry (rejected —
contradicts the clarified decision); adding a backend `/users` endpoint
(rejected — out of scope; this repository does not own the backend).

## Decision: Ticket list pagination — server-driven paging UI

**Context**: `GET /api/v1/tickets` returns a `TicketPage`
(`content`, `page`, `size`, `totalElements`, `totalPages`) and accepts
`page`/`size` query params (default `size` 20).

**Decision**: The ticket list page uses an MUI `Pagination` control bound
to `TicketPage.page`/`totalPages`, passing `page`/`size` (and the active
`q`/`status` filters) on every request.

**Rationale**: The backend already enforces paging; ignoring it and trying
to load "all" tickets client-side would silently diverge from the backend
contract and degrade at moderate scale (the spec assumes tens to low
hundreds of tickets).

**Alternatives considered**: Client-side-only pagination over a
fully-loaded list (rejected — backend never returns more than one page per
request, so this would require N sequential requests and duplicate the
backend's own paging logic).

## Decision: Comment listing — dedicated paginated endpoint, no author field

**Context**: The spec was amended (Clarifications, 2026-09-21) to drop the
comment `author` field (this slice has no user identity/authentication)
and to require paginated comment loading (FR-006a). `backend-api-doc.json`
was updated in step with this: `GET /api/v1/tickets/{ticketId}/comments`
now returns a `CommentPage` (`content`, `page`, `size`, `totalElements`,
`totalPages`; oldest-to-newest; default `size` 20), and `CommentResponse`
has no author field (`id`, `ticketId`, `content`, `createdAt` only).
`TicketDetailResponse` still has an embedded `comments: Comment[]` field,
but it is not paginated and is now redundant with the dedicated endpoint.

**Decision**: The comment list on `TicketDetailPage` is sourced from
`GET /api/v1/tickets/{id}/comments` via a new `useComments` hook (own
`page`/`size` state, independent of the ticket-detail query), not from
`TicketDetailResponse.comments`. `CommentList` renders an MUI `Pagination`
control (or "Load more") bound to `CommentPage.page`/`totalPages`, the
same pattern as the ticket list (see "Ticket list pagination" above).
Adding a comment invalidates the comments query (not just the ticket
query) so the new comment reappears without the agent re-requesting every
previously loaded page (spec.md Edge Cases).

**Rationale**: The backend now treats comments as their own paginated
resource, independent of the ticket's other fields, per its own endpoint
description; following that contract (rather than continuing to read the
embedded, unpaginated `comments` array) is both what FR-006a requires and
what the backend's own documentation now signals as the intended path.

**Alternatives considered**: Continue reading `TicketDetailResponse.comments`
and paginate client-side over the full array (rejected — the backend
doesn't return that array paginated, so "all comments" would still be
fetched in one response, and the array would silently drift out of sync
with the dedicated endpoint's page-1 result); ignore the new endpoint and
drop FR-006a (rejected by the user when this was raised as a decision
point — the backend now supports real pagination, so the frontend should
use it).

## Decision: Status-transition UX

**Decision**: A `StatusTransitionMenu` component computes the set of
*valid next statuses* for the ticket's current status from a local
constant map mirroring FR-010 (`OPEN → IN_PROGRESS, CANCELLED`;
`IN_PROGRESS → RESOLVED, CANCELLED`; `RESOLVED → CLOSED`; `CLOSED → []`;
`CANCELLED → []`), and only offers those as selectable actions. Every
selection still calls `POST /api/v1/tickets/{id}/transitions`; a `409`
response is displayed verbatim and does not change the displayed status.

**Rationale**: Principle III explicitly permits the UI to *restrict what
it offers* as a usability aid while still treating the backend as the sole
authority — this menu is a convenience, not a second implementation of the
state machine; the backend's response is always what determines the
ticket's actual status.
