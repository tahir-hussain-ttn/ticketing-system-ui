---

description: "Task list template for feature implementation"
---

# Tasks: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

**Input**: Design documents from `/specs/002-similar-ticket-suggestions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: Included — the project constitution's Development Workflow gate
requires success + rejected/error path tests for every change touching
ticket create/update/comment/search/filter flows, and this feature extends
that to login, reassignment, and the chatbot.

**Organization**: Tasks are grouped by user story (spec.md) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every task

## Path Conventions

Single frontend project — `src/`, `tests/` at repository root (per plan.md
Project Structure; no `backend/`/`frontend/` split, this repo is the
frontend only).

---

## Phase 1: Setup

**Purpose**: Confirm the existing project baseline needs no new tooling

- [x] T001 Confirm `package.json` already satisfies plan.md's Technical
  Context (React 18.3, TypeScript 5.6 strict, MUI v6, TanStack Query v5,
  React Router v6.28, Vitest/RTL/MSW) — no new dependency is added by this
  feature (repository root `package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth/session plumbing and domain-type changes every user story
depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Add `User` and `Role` types in `src/types/user.ts`:
  `Role = "SUPPORT" | "GENERAL" | "ADMIN"`; `User { id: string; name:
  string; role: Role }` (data-model.md, User)
- [x] T003 [P] Extend `Ticket` in `src/types/ticket.ts`: change `assignee`
  from `string | undefined` to `User | null`; add `creator: User`
  (data-model.md, Ticket)
- [x] T004 [P] Extend `Comment` in `src/types/comment.ts`: add `author:
  User` (data-model.md, Comment)
- [x] T005 Remove `src/config/assignees.ts` — superseded by the
  backend-sourced `SUPPORT` user list (research.md, "Support-user listing
  endpoint")
- [x] T006 [P] Create `src/api/authApi.ts`: `login({ email, password })` →
  `POST /api/v1/auth/login` returning `{ user: User; token: string }`, and
  `logout()` → `POST /api/v1/auth/logout` (contracts/README.md)
- [x] T007 Create `src/auth/session.ts`: module-level token
  get/set/clear, mirrored to `sessionStorage` for reload survival within a
  tab, plus an expiry pub/sub callback (research.md, "Session/token
  handling")
- [x] T008 Modify `src/api/http.ts`: attach `Authorization: Bearer
  <token>` (read via `src/auth/session.ts`) to every request except login;
  on a `401` response, invoke `session.ts`'s expiry callback instead of
  throwing an ordinary `HttpError` (contracts/README.md, frontend-side
  contract notes)
- [x] T009 Create `src/context/AuthContext.tsx`: holds the signed-in
  `User`/role (or none) via `src/auth/session.ts` + `src/api/authApi.ts`,
  subscribes to `session.ts`'s expiry callback to clear state on session
  loss (FR-006)
- [x] T010 Create `src/routes/ProtectedRoute.tsx`: redirects to `/login`
  via `<Navigate>` when `AuthContext` has no signed-in user (FR-002)
- [x] T011 Wrap the app in the `AuthContext` provider in `src/App.tsx`
  (mounted before `<RouterProvider>`)
- [x] T012 [P] Add MSW handlers for `POST /api/v1/auth/login` (`200 {
  user, token }`, `401` generic invalid-credentials, `400` missing field)
  and `POST /api/v1/auth/logout` (`204`) in `tests/msw/handlers.ts`
  (contracts/README.md)

**Checkpoint**: Auth plumbing and updated domain types exist — user story
implementation can now begin.

---

## Phase 3: User Story 1 - Log In and Out (Priority: P1) 🎯 MVP

**Goal**: A person must log in before reaching any other page, and can log
out to end their session.

**Independent Test**: Load the app signed out and confirm every route
redirects to `/login`; log in with valid/invalid credentials and confirm
correct accept/reject behavior; log out and confirm access is revoked
again.

### Tests for User Story 1

- [x] T013 [P] [US1] Integration test: every protected route redirects to
  `/login` when signed out, in
  `tests/integration/protected-route.test.tsx` (FR-002, spec.md Story 1
  Scenario 1)
- [x] T014 [P] [US1] Integration test: valid login succeeds, wrong
  password/unregistered email shows one generic invalid-credentials
  message, blank-field submission shows a field-level error without
  contacting the backend, logout revokes access, and a `401` mid-session
  is treated as sign-out, in `tests/integration/login.test.tsx` (FR-001–
  FR-006, spec.md Story 1 Scenarios 2–6)

### Implementation for User Story 1

- [x] T015 [US1] Create `src/hooks/useLogin.ts`: TanStack Query mutation
  wrapping `authApi.login`, updates `AuthContext` on success (depends on
  T006, T009)
- [x] T016 [US1] Create `src/hooks/useLogout.ts`: mutation wrapping
  `authApi.logout`, clears `AuthContext` + `session.ts` on success
  (depends on T006, T009)
- [x] T017 [US1] Create `src/pages/LoginPage.tsx`: MUI form (email,
  password); blank-field validation without contacting the backend
  (FR-004); a single generic invalid-credentials message on `401`
  (FR-003); uses `useLogin` (depends on T015)
- [x] T018 [US1] Add a "log out" control, visible only when signed in, to
  the app's shared chrome (new `src/components/AppHeader/AppHeader.tsx` or
  addition to `src/App.tsx`), calling `useLogout` (FR-005) (depends on
  T016)
- [x] T019 [US1] Modify `src/routes/router.tsx`: add an unprotected
  `/login` route rendering `LoginPage`; wrap the existing ticket routes
  (`/`, `/tickets/new`, `/tickets/:ticketId`, `/tickets/:ticketId/edit`)
  with `ProtectedRoute` (depends on T010, T017)

**Checkpoint**: User Story 1 is fully functional and independently
testable — every other page is now reachable only when signed in.

---

## Phase 4: User Story 2 - See Automatic Assignment, and Reassign as Admin (Priority: P1)

**Goal**: Ticket assignment is system-chosen and displayed read-only;
`ADMIN` users can reassign, no one else can.

**Independent Test**: Create a ticket as any role and confirm no assignee
field is offered and the detail page shows the system-chosen assignee (or
"Unassigned"); as `ADMIN`, reassign via the detail-page control; as a
non-`ADMIN`, confirm no such control appears.

### Tests for User Story 2

- [x] T020 [P] [US2] Integration test: create form has no assignee field,
  detail page shows assignee name or "Unassigned", `ADMIN` reassignment
  succeeds and updates the display, a failed reassignment leaves the
  control open with the attempted selection and an inline error, no
  reassignment control for non-`ADMIN`, and the edit page has no assignee
  field, in `tests/integration/reassign-ticket.test.tsx` (FR-007–FR-012,
  FR-011a, spec.md Story 2, all scenarios)

### Implementation for User Story 2

- [x] T021 [P] [US2] Create `src/api/usersApi.ts`: `listSupportUsers()` →
  `GET /api/v1/users?role=SUPPORT` returning `User[]` (contracts/README.md,
  marked `Assumed`)
- [x] T022 [US2] Add `reassignTicket(ticketId, assigneeId)` to
  `src/api/ticketsApi.ts`: `POST /api/v1/tickets/{ticketId}/reassign`,
  body `{ assigneeId: string }` (contracts/README.md)
- [x] T023 [US2] Remove the `assignee` field from the create-ticket
  request payload in `src/api/ticketsApi.ts` — never sent, not even
  `null` (FR-007)
- [x] T024 [P] [US2] Create `src/hooks/useSupportUsers.ts`: query wrapping
  `usersApi.listSupportUsers` (depends on T021)
- [x] T025 [US2] Create `src/hooks/useReassignTicket.ts`: mutation
  wrapping `ticketsApi.reassignTicket`, invalidates the ticket-detail query
  on success only (depends on T022)
- [x] T026 [US2] Create `src/components/ReassignControl/ReassignControl.tsx`:
  `ADMIN`-only dropdown of `SUPPORT` users; on failure, keeps the control
  open with the attempted selection and an inline error, and never reverts
  or clears before a confirmed success (FR-010–FR-012, FR-011a) (depends
  on T024, T025)
- [x] T027 [US2] Modify `src/pages/TicketDetailPage.tsx`: display
  `ticket.assignee?.name ?? "Unassigned"`; render `ReassignControl` only
  when the signed-in user's role is `ADMIN` (depends on T026)
- [x] T028 [P] [US2] Remove the assignee field from
  `src/pages/TicketCreatePage.tsx` (title/description/priority only)
  (FR-007)
- [x] T029 [P] [US2] Remove the assignee field from
  `src/pages/TicketEditPage.tsx` (title/description/priority only)
  (FR-009)
- [x] T030 [P] [US2] Add MSW handlers for `GET
  /api/v1/users?role=SUPPORT` and `POST
  /api/v1/tickets/{ticketId}/reassign` (success and failure cases) in
  `tests/msw/handlers.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Ask the Chatbot for a Resolution, from Anywhere (Priority: P1)

**Goal**: A persistent, collapsed-by-default chatbot widget on every page
answers from past resolved tickets, with plain-text citations, and
survives navigation.

**Independent Test**: Open the widget from any page, submit a query
matching a known resolved ticket, confirm a cited (non-link) response;
navigate away and back and confirm the conversation persists; submit a
non-matching query and confirm the no-match message.

### Tests for User Story 3

- [x] T031 [P] [US3] Integration test: widget renders collapsed by
  default, opens and returns a cited plain-text (non-clickable) response,
  a follow-up reflects prior context, the widget/conversation persists
  across a simulated navigation, an empty query is blocked client-side, a
  non-matching query shows the no-confident-match message with a link to
  ticket creation, and a backend failure shows a distinct
  service-unavailable message, in
  `tests/integration/chatbot-widget.test.tsx` (FR-013–FR-020, spec.md
  Story 3, all scenarios)

### Implementation for User Story 3

- [x] T032 [P] [US3] Add `ChatbotConversation` and `ChatbotTurn` types in
  `src/types/chatbot.ts` (data-model.md)
- [x] T033 [US3] Create `src/api/chatbotApi.ts`: `submitQuery(query,
  conversationId?)` → `POST
  /api/v1/chatbot/conversations/{conversationId?}/queries`
  (contracts/README.md, marked `Assumed`)
- [x] T034 [US3] Create `src/context/ChatbotContext.tsx`: widget
  open/closed state (default closed, FR-013b), the current
  `ChatbotConversation`, turn-append logic, and explicit-end/30-minute-
  inactivity handling that starts a new conversation on the next query
  (FR-019) (depends on T032)
- [x] T035 [US3] Create `src/hooks/useChatbotQuery.ts`: TanStack Query
  mutation wrapping `chatbotApi.submitQuery`; rejects empty/blank input
  client-side before calling the backend (FR-014) (depends on T033)
- [x] T036 [P] [US3] Create
  `src/components/ChatbotWidget/ChatbotWidget.tsx`: MUI `Fab`, collapsed
  by default (FR-013b), expands into the conversation panel (depends on
  T034)
- [x] T037 [US3] Create
  `src/components/ChatbotWidget/ChatbotConversationView.tsx`: renders
  ordered turns, the query input, plain-text non-clickable source-ticket
  citations (FR-015, FR-020), a distinct no-confident-match message
  linking to `/tickets/new` (FR-017), and a distinct service-unavailable
  message (FR-018) (depends on T035, T036)
- [x] T038 [US3] Mount the `ChatbotContext` provider and `ChatbotWidget`
  once in `src/App.tsx`, outside `<RouterProvider>`, so both survive route
  navigation (FR-013a) (depends on T034, T036)
- [x] T039 [P] [US3] Add an MSW handler for `POST
  /api/v1/chatbot/conversations/{conversationId?}/queries` covering
  answered, no-match, `400` empty-query, and `503` unavailable cases in
  `tests/msw/handlers.ts`

**Checkpoint**: User Stories 1, 2, and 3 (the full P1 set) all work
independently.

---

## Phase 6: User Story 4 - See Who Commented, and Comment Only If Allowed (Priority: P2)

**Goal**: Comments show their author's name; only a ticket's creator or
assignee can add one.

**Independent Test**: As a ticket's creator or assignee, add a comment and
confirm it shows your name; as an unrelated signed-in viewer, confirm
commenting is unavailable or rejected.

### Tests for User Story 4

- [x] T040 [P] [US4] Integration test: comment history shows each
  comment's author name, the comment form is shown only to the ticket's
  creator or its assigned `SUPPORT` user, and an unauthorized comment
  attempt is rejected with a clear message and not added, in
  `tests/integration/comment-authorization.test.tsx` (FR-021–FR-023,
  spec.md Story 4, all scenarios)

### Implementation for User Story 4

- [x] T041 [US4] Modify `src/components/CommentList/CommentList.tsx` to
  render `comment.author.name` alongside content and timestamp (FR-021)
- [x] T042 [US4] Modify `src/pages/TicketDetailPage.tsx`: show the
  comment form only when the signed-in user's ID equals `ticket.creator.id`
  or `ticket.assignee?.id` (FR-022); on a backend `403` for comment
  submission, show a clear authorization message and do not add the
  comment (FR-023)
- [x] T043 [P] [US4] Update the comment-creation MSW handler in
  `tests/msw/handlers.ts` to return `403` when the requesting test-fixture
  user is neither the ticket's creator nor its assignee, alongside the
  existing success case

**Checkpoint**: User Stories 1, 2, 3, and 4 all work independently.

---

## Phase 7: User Story 5 - Filter the Ticket List by Ownership, with Restricted Single-Ticket View (Priority: P3)

**Goal**: The ticket list can be scoped by ownership (with a creator
column), and viewing a ticket outside one's permission is clearly refused.

**Independent Test**: Select each ownership scope in turn and confirm only
matching tickets appear (with "assigned to me" hidden for `GENERAL`); as a
`GENERAL` user, navigate to an unauthorized ticket and confirm a "not
permitted" state.

### Tests for User Story 5

- [x] T044 [P] [US5] Integration test: ownership-scope selector filters
  correctly for each of "created by me"/"assigned to me"/"all", the
  "assigned to me" option is absent for a `GENERAL`-role user, the list
  shows a creator-name column, an ownership scope combines correctly with
  an existing keyword/status filter, and a `GENERAL` user viewing an
  unauthorized ticket sees a "not permitted" state, in
  `tests/integration/ownership-scope-filter.test.tsx` (FR-023a–FR-026,
  spec.md Story 5, all scenarios)

### Implementation for User Story 5

- [x] T045 [US5] Add a `scope: "created" | "assigned" | "all"` query
  param to `listTickets` in `src/api/ticketsApi.ts` (contracts/README.md)
- [x] T046 [US5] Add an ownership-scope selector to
  `src/pages/TicketListPage.tsx`: all three options for `SUPPORT`/`ADMIN`,
  only "created by me"/"all" for `GENERAL` (FR-024, FR-024a)
- [x] T047 [P] [US5] Add a creator-name column to
  `src/components/TicketList/TicketList.tsx` (FR-023a)
- [x] T048 [US5] Modify `src/pages/TicketDetailPage.tsx`: render a "not
  permitted to view this ticket" state instead of ticket details when the
  ticket-detail fetch returns `403` (FR-026) (same file as T027/T042 —
  sequential, not parallel with those)
- [x] T049 [P] [US5] Add MSW handlers: `GET /api/v1/tickets` honoring
  `scope`, and a `403` case for `GET /api/v1/tickets/{ticketId}`, in
  `tests/msw/handlers.ts`

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T050 [P] Update `tests/integration/create-ticket.test.tsx` and
  `tests/integration/update-ticket.test.tsx` (existing spec-001 tests) for
  the new `Ticket`/`Comment` shapes (`assignee`/`creator`/`author` as
  `User` objects) so they keep passing
- [x] T051 Run `npm run typecheck` and resolve any strict-mode fallout
  from the type changes across `src/` (Constitution II)
- [ ] T052 Run the quickstart.md manual validation scenarios 1–5 end-to-end
  in a running browser session (Constitution Development Workflow gate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–7)**: All depend on Foundational completion.
  Automated tests for US2–US5 authenticate via a test fixture that sets
  `session.ts`'s token directly, so they do not need US1's `LoginPage` UI
  to exist — only the Foundational auth plumbing (T002–T012). A full
  manual/E2E run of any story, however, does need US1's login flow to be
  usable.
- **Polish (Phase 8)**: Depends on all desired user stories being
  complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P1)**: Foundational only; independent of US1/US3/US4/US5.
- **US3 (P1)**: Foundational only; independent of US1/US2/US4/US5.
- **US4 (P2)**: Foundational only; independent of other stories (the
  `Comment.author` type it reads is added in Foundational, not by US1–US3).
- **US5 (P3)**: Foundational only; T048 touches the same file as
  US2's T027 and US4's T042 (`TicketDetailPage.tsx`), so those three tasks
  must be applied sequentially regardless of story order, even though the
  stories themselves are independently testable.

### Within Each User Story

- Tests are written before implementation and must fail first.
- API client functions before hooks; hooks before components/pages.
- Story complete and independently testable before moving to the next.

### Parallel Opportunities

- Foundational: T002, T003, T004 (different type files); T006, T012 (once
  T002 exists).
- US1: T013, T014 (different test files).
- US2: T020 (test) parallel with nothing yet; T021 parallel with nothing;
  T024 parallel with T028, T029, T030 once their own dependencies are met.
- US3: T031 (test); T032, T036, T039 in parallel with their respective
  dependents satisfied.
- Different user stories' *test* tasks (T013/T014, T020, T031, T040, T044)
  can all be written in parallel by different people once Foundational is
  done, since they target different files.

---

## Parallel Example: Foundational Phase

```bash
# Launch independent type-definition tasks together:
Task: "Add User and Role types in src/types/user.ts"
Task: "Extend Ticket in src/types/ticket.ts"
Task: "Extend Comment in src/types/comment.ts"
```

## Parallel Example: User Story 2

```bash
# Once T021 (usersApi) and T022 (reassignTicket) exist:
Task: "Create src/hooks/useSupportUsers.ts"
Task: "Remove assignee field from src/pages/TicketCreatePage.tsx"
Task: "Remove assignee field from src/pages/TicketEditPage.tsx"
Task: "Add MSW handlers for support-users and reassign endpoints"
```

---

## Implementation Strategy

### MVP First

Spec.md ranks US1, US2, and US3 all as P1 — together they are the MVP (a
user cannot meaningfully use assignment or the chatbot without being
signed in first, and per spec.md's own framing the chatbot "has never
existed disconnected from login").

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (US1) — **STOP and VALIDATE** login/logout
   independently.
3. Complete Phase 4 (US2) — validate assignment display/reassignment.
4. Complete Phase 5 (US3) — validate the chatbot widget.
5. Deploy/demo the P1 MVP.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → Test independently → (not yet demo-worthy alone; unlocks
   everything else).
3. US2 → Test independently → Demo (assignment + login = usable MVP
   slice).
4. US3 → Test independently → Demo (full P1 MVP).
5. US4 → Test independently → Demo.
6. US5 → Test independently → Demo (feature-complete).

### Parallel Team Strategy

Once Foundational is done, up to three developers can take US1, US2, and
US3 in parallel (all P1, all Foundational-only dependencies); US4 and US5
can start as soon as a developer frees up, subject to the T027/T042/T048
same-file sequencing note above.
