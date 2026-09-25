# Research: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

All Technical Context items were resolvable from the constitution, the
feature spec, the backend spec (`ticketing-system/specs/005-auth-rag-chatbot/spec.md`,
sibling repo), and the existing frontend codebase. One item required a
documented assumption because the source of truth (`backend-api-doc.json`)
has not yet been regenerated for the backend feature this UI consumes — see
"Backend contract currency" below. No unresolved `NEEDS CLARIFICATION`
markers remain.

## Decision: Backend contract currency — assumed endpoints, pending confirmation

**Context**: `backend-api-doc.json` (this repo's OpenAPI source of truth,
per spec 001's contracts) only documents the four endpoints from spec
001 (`/api/v1/tickets`, `.../transitions`, `.../comments`, `.../{id}`). It
has not been regenerated for backend spec `005-auth-rag-chatbot`, which
adds login, auto-assignment, reassignment, the chatbot, and named comment
authorship. That backend spec exists as a design document in the sibling
`ticketing-system` repository but its own OpenAPI doc/implementation status
is outside this repository's visibility.

**Decision**: Proceed with endpoint shapes *derived directly from backend
spec 005's Functional Requirements* (documented in `contracts/README.md`),
treating them as the best-available contract, and flag every assumed
endpoint clearly so a future `backend-api-doc.json` regeneration can be
diffed against them before implementation merges. One endpoint has no FR to
derive from at all (listing `SUPPORT`-role users for the reassignment
control) — see the next decision.

**Rationale**: Blocking planning on the backend repo publishing an updated
OpenAPI doc would stall this frontend feature indefinitely; backend spec
005 is detailed enough (roles, request/response semantics implied by its
acceptance scenarios) to derive a reasonable, typed contract now, with the
mismatch risk isolated to `contracts/README.md` and `src/types/` rather
than spread across components.

**Alternatives considered**: Wait for `backend-api-doc.json` to be updated
before planning (rejected — no committed timeline, and this UI repo does
not own that file's regeneration); reverse-engineer endpoints by pointing
at a live backend instance (rejected — no such instance is available in
this environment).

## Decision: Support-user listing endpoint — assumed `GET /api/v1/users?role=SUPPORT`

**Context**: The `ADMIN`-only reassignment control (spec.md FR-010) needs a
list of current `SUPPORT` users to populate. Backend spec 005 requires the
*capability* (auto-assignment picks from `SUPPORT` users) but never
specifies a listing endpoint for the frontend to call directly.

**Decision**: Assume a `GET /api/v1/users?role=SUPPORT` endpoint returning
`User[]`, added to `contracts/README.md` as an explicitly-flagged
assumption (not sourced from an FR), consumed via a new `usersApi.ts` +
`useSupportUsers` hook. If the real backend exposes a different shape (e.g.
`/api/v1/support-users`), only `usersApi.ts` needs to change.

**Rationale**: Isolates the one genuinely-invented endpoint behind a single
typed function, matching Constitution Principle V's "single typed API
client" intent — a wrong guess here is a one-file fix, not a
component-level rewrite.

**Alternatives considered**: Reuse the general ticket list to infer
`SUPPORT` users from ticket assignees (rejected — misses `SUPPORT` users
with zero currently-assigned tickets, which is exactly the case FR-012's
"no `SUPPORT` user existed yet" edge case describes); hardcode a static
list like the superseded `src/config/assignees.ts` (rejected — spec 005
makes `SUPPORT` membership a backend-owned, role-based fact, not a
frontend-maintained list; the old static-list approach is explicitly what
this feature replaces).

## Decision: Session/token handling — in-memory token + `sessionStorage` mirror, `Authorization` header

**Context**: Backend spec 005 requires almost every request to carry an
authenticated context (FR-006) but leaves the session mechanism itself to
planning (spec 005 Assumptions; spec 002 Assumptions).

**Decision**: `POST /api/v1/auth/login` returns a token (assumed shape —
see contracts/README.md). `src/auth/session.ts` holds it in a module-level
variable (source of truth for the current request cycle) and mirrors it to
`sessionStorage` only so a page reload within the same tab does not force
a re-login; `src/api/http.ts` reads it via `session.ts` and attaches
`Authorization: Bearer <token>` to every request. A `401`/`403` response
triggers `session.ts`'s expiry callback, which `AuthContext` subscribes to
in order to clear state and redirect to `/login` (FR-006).

**Rationale**: `sessionStorage` (tab-scoped, cleared on tab close) is a
narrower blast radius than `localStorage` for a token, while still
surviving a reload — matching spec.md's assumption that session
persistence is an implementation detail, not a hard requirement, while
still giving a reasonable UX. Centralizing attachment/expiry in
`session.ts` + `http.ts` means no component ever handles the token
directly (Constitution VI — no secret handling scattered through
component code).

**Alternatives considered**: `localStorage` (rejected — persists beyond
tab/browser-session close with no corresponding "remember me" requirement
in the spec, wider exposure window for the same benefit); cookie-based
session set by the backend (rejected as the planning assumption — nothing
in backend spec 005 mentions `Set-Cookie`/CORS-credentials semantics, and
guessing that shape is riskier than an explicit bearer-token header this
frontend fully controls); React Context alone with no `sessionStorage`
mirror (rejected — a full page reload would silently sign the user out
mid-work with no backend-driven reason, a worse UX than the token
being a runtime value).

## Decision: Chatbot conversation state — App-level Context, not TanStack Query

**Context**: The chatbot widget (spec.md User Story 3) must stay mounted
and keep its conversation across page navigation (FR-013a), unlike ticket
data which is fetched per-page.

**Decision**: `ChatbotContext` (mounted once in `App.tsx`, alongside the
router, not inside it) holds the widget's open/closed state and the
current `ChatbotConversation` (ordered `ChatbotTurn[]`). Submitting a query
uses a TanStack Query `useMutation` (`useChatbotQuery`) for its
loading/error semantics, but the resulting turn is appended to
`ChatbotContext`'s array, not to the Query cache — there is nothing to
invalidate or refetch for a conversation, only turns to append.

**Rationale**: TanStack Query's cache model fits GET-able, refetchable
server state (tickets, comments); a chatbot conversation is
append-only client-side state keyed to one browser session, not a
resource with a stable cache key to invalidate — Context is the simpler
fit and avoids fighting the cache for ordering guarantees.

**Alternatives considered**: Store conversation in a Query cache entry
keyed by conversation ID (rejected — no read-refetch use case exists;
would only add cache-invalidation complexity for no benefit);
`localStorage`-backed conversation persistence across full reloads
(rejected — not required by spec.md, which only requires persistence
across in-app navigation, not reloads; adding it would be undocumented
scope).

## Decision: Chatbot widget UI — collapsed FAB + expandable panel, mounted outside the router

**Context**: Clarifications (2026-09-24) fixed the widget as
collapsed-by-default and available on every page.

**Decision**: `ChatbotWidget` renders an MUI `Fab` (collapsed state) that
expands into a fixed-position panel (`ChatbotConversationView`) showing
turns, the query input, and citations. It is rendered once in `App.tsx`
outside `<RouterProvider>`, so route changes never unmount/remount it.

**Rationale**: Placing it outside the router is the direct mechanism for
FR-013a (widget/conversation survives navigation) — anything rendered
inside a route element unmounts on navigation by default in React Router.

**Alternatives considered**: Render the widget per-page (rejected —
directly violates FR-013a, would reset on every navigation); a dedicated
route/page for the chatbot (rejected outright by the 2026-09-24
Clarifications answer).

## Decision: Reassignment control failure UX — inline, non-discarding error

**Context**: Clarifications (2026-09-24) fixed the behavior for a failed
reassignment attempt.

**Decision**: `ReassignControl` keeps local state for "currently selected
(not yet confirmed) `SUPPORT` user" separate from the ticket's confirmed
assignee. On mutation failure, the control stays open with that selection
still shown and displays an inline `FormHelperText`-style error; only a
successful response (Constitution III) updates the ticket's displayed
assignee.

**Rationale**: Directly implements the clarified answer and mirrors the
existing `TicketForm` pattern (spec 001 FR-013: preserve in-progress edits
on save failure) rather than inventing a new failure pattern for this one
control.

**Alternatives considered**: Toast/banner + revert-to-prior-value
(rejected — this was Option B in Clarifications, not selected).

## Decision: Ticket/Comment type changes — assignee/creator/author as `User` references

**Context**: `src/types/ticket.ts`'s `assignee?: string` and
`src/types/comment.ts`'s author-less shape were correct for spec 001 but
are now inconsistent with backend spec 005 (assignee and comment author are
now real, named user references, and tickets gain a `creator`).

**Decision**: `Ticket.assignee` becomes `User | null` (was `string |
undefined`); add `Ticket.creator: User`; `Comment` gains
`author: User`. `src/config/assignees.ts`'s static string list is removed
entirely — assignee display now always renders `assignee.name`, and the
reassignment dropdown is populated from `useSupportUsers` (backend-sourced
`User[]`), not a frontend-owned constant.

**Rationale**: Matches backend spec 005's Key Entities section directly
(assignee/creator/author are all `User` references, not free strings), and
keeps ticket/comment domain types canonical in one place (Constitution II).

**Alternatives considered**: Keep `assignee`/`author` as plain display-name
strings (rejected — loses the ability to compare "is the viewer this
ticket's assignee" by ID, which FR-010/FR-022's authorization-gated UI
controls need; a name string is not a stable identity to compare against
the signed-in user's ID).

## Carried over from spec 001 (unchanged)

Build tooling (Vite), UI library (MUI v6), server-state management
(TanStack Query v5), HTTP client (native `fetch` via a typed wrapper),
routing (React Router v6), and testing stack (Vitest + RTL + MSW) all
remain correct for this feature — see `specs/001-ticket-management-ui/research.md`
for their original rationale, which this feature does not revisit.
Ticket-list pagination and the status-transition UX approach from spec 001
are also unchanged by this feature.
