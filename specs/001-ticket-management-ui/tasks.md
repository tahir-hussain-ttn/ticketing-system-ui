---

description: "Task list template for feature implementation"
---

# Tasks: Support Ticket Management UI

**Input**: Design documents from `/specs/001-ticket-management-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: Included — the constitution's Development Workflow gate requires
every change touching create/update/comment/search/filter flows to include
a success-path and a rejected/error-path test.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Path Conventions

Single frontend project at the repository root (no backend code in this
repo): `src/`, `tests/` — per plan.md's Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create Vite + React + TypeScript project scaffold at repository root per plan.md Project Structure (`package.json`, `vite.config.ts`, `tsconfig.json` with `"strict": true`)
- [X] T002 [P] Install and configure runtime dependencies: `react-router-dom`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@tanstack/react-query`
- [X] T003 [P] Install and configure dev/test dependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `msw`
- [X] T004 [P] Configure ESLint + Prettier for TypeScript strict mode with a rule forbidding `any` (Constitution Principle II)
- [X] T005 [P] Create env config in `src/config/env.ts` reading `VITE_API_BASE_URL`; add `.env.example` (placeholders only — named to match the existing `.gitignore`'s `!.env.example` exception rather than `.env.local.example`) and confirm `.env*.local` is git-ignored (Constitution Principle VI)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Define `src/types/ticket.ts`: `Ticket` (`id: string` UUID, `title: string` — backend allows 0–200 chars but UI additionally requires non-empty, `description: string`, `priority: Priority`, `status: Status`, `assignee?: string`, `createdAt: string`, `updatedAt: string`), `Priority` = `"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`, `Status` = `"OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED"`, `TicketPage` (`content: Ticket[]`, `page: number`, `size: number`, `totalElements: number`, `totalPages: number`) — per data-model.md
- [X] T007 [P] Define `src/types/comment.ts`: `Comment` (`id: string` UUID, `ticketId: string` UUID, `content: string` — required, `minLength: 1`, `createdAt: string`) — per data-model.md
- [X] T008 [P] Define `src/types/apiError.ts`: `ApiError` (`code: string`, `message: string`, `timestamp: string`, `path: string`, `fieldErrors: ApiFieldError[]`), `ApiFieldError` (`field: string`, `message: string`) — per data-model.md
- [X] T009 [P] Define request types in `src/types/requests.ts`, per contracts/README.md's schema table: `TicketCreateRequest` (`title: string`, `description: string`, `priority: Priority`, `assignee?: string`), `TicketUpdateRequest` (`title?: string`, `description?: string`, `priority?: Priority`, `assignee?: string` — never `status`), `TicketTransitionRequest` (`status: Status`), `TicketListParams` (`q?: string`, `status?: Status`, `page?: number`, `size?: number`), `CommentCreateRequest` (`content: string`) (depends on T006, T007)
- [X] T010 Implement shared `mapFieldErrors` utility in `src/utils/mapFieldErrors.ts`: takes an `ApiError` and a list of known form field names, returns a `Record<field, message>` plus any unmatched errors as a general-error list, so `TicketForm` and `CommentForm` render backend `fieldErrors` consistently (FR-012) (depends on T008)
- [X] T011 Implement typed HTTP client in `src/api/http.ts`: `fetch` wrapper using `VITE_API_BASE_URL` from `src/config/env.ts`, parses JSON, and on non-2xx responses parses and throws the body as `ApiError` (depends on T005, T008)
- [X] T012 [P] Create MUI theme in `src/theme/muiTheme.ts` implementing Material Design per the constitution's UX mandate
- [X] T013 Create app shell `src/App.tsx` and `src/main.tsx` wiring `QueryClientProvider` (TanStack Query), MUI `ThemeProvider` (T012), and the router (depends on T012)
- [X] T014 Create router skeleton in `src/routes/router.tsx` with routes for `/` and `/tickets/new` (depends on T013); `/tickets/:id` is added in T043 (Phase 4) when `TicketDetailPage` exists, rather than as an empty placeholder now
- [X] T015 [P] Create static known-users list in `src/config/assignees.ts` per research.md's "Assignee list source" decision (frontend-owned list; backend `assignee` field is a plain string with no listing endpoint)
- [X] T016 [P] Set up MSW scaffold: `tests/msw/server.ts` (Node server) and `tests/msw/handlers.ts` (handlers array populated incrementally per story), wired into the Vitest setup file

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Create and List Tickets (Priority: P1) 🎯 MVP

**Goal**: A support agent creates a ticket and sees it appear in the ticket list with title, status, priority, and assignee visible.

**Independent Test**: Submit the create-ticket form with valid data and confirm the new ticket appears in the ticket list with the data entered (spec.md US1).

### Tests for User Story 1

- [X] T017 [P] [US1] Integration test: create-ticket success path (submits valid title/description/priority, asserts new ticket appears in list with status `OPEN`) in `tests/integration/create-ticket.test.tsx`
- [X] T018 [P] [US1] Integration test: create-ticket validation-error path (empty title blocked client-side per FR-001 acceptance scenario 2; a backend `400` with `fieldErrors` is rendered next to the matching field) in `tests/integration/create-ticket.test.tsx`
- [X] T019 [P] [US1] Integration test: ticket list renders title, status, priority, and assignee for each ticket without opening it (FR-002) in `tests/integration/ticket-list.test.tsx`

### Implementation for User Story 1

- [X] T020 [P] [US1] Add MSW handlers for `GET /api/v1/tickets` (200 `TicketPage`) and `POST /api/v1/tickets` (201 `TicketResponse` / 400 `ApiError`) in `tests/msw/handlers.ts`
- [X] T021 [US1] Implement `ticketsApi.list(params: TicketListParams)` and `ticketsApi.create(request: TicketCreateRequest)` in `src/api/ticketsApi.ts`, typed per `TicketCreateRequest`/`TicketResponse`/`TicketPage` (depends on T011, T006, T009)
- [X] T022 [US1] Implement `useTickets` hook (TanStack Query list + pagination) in `src/hooks/useTickets.ts` (depends on T021)
- [X] T023 [US1] Implement `useCreateTicket` hook (TanStack Query mutation, invalidates the ticket list query on success) in `src/hooks/useCreateTicket.ts` (depends on T021)
- [X] T024 [P] [US1] Implement `StatusBadge` component in `src/components/StatusBadge/StatusBadge.tsx` rendering one of `OPEN`/`IN_PROGRESS`/`RESOLVED`/`CLOSED`/`CANCELLED`
- [X] T025 [P] [US1] Implement `PriorityBadge` component in `src/components/PriorityBadge/PriorityBadge.tsx` rendering one of `LOW`/`MEDIUM`/`HIGH`/`CRITICAL`
- [X] T026 [US1] Implement `TicketForm` component (create mode) in `src/components/TicketForm/TicketForm.tsx`: `title` required non-empty (backend max 200 chars), `description` required non-empty (backend `minLength: 1`), `priority` required select from the four `Priority` values, `assignee` optional select sourced from `src/config/assignees.ts`; blocks submission and shows a field-specific error when `title` or `description` is empty, and uses the shared `mapFieldErrors` utility (T010) to render any backend `400 fieldErrors` (depends on T006, T009, T010, T013, T024, T025)
- [X] T027 [US1] Implement `TicketList` component in `src/components/TicketList/TicketList.tsx` showing title/status/priority/assignee per ticket, plus a distinct empty-list state (FR-015) (depends on T024, T025)
- [X] T028 [US1] Implement `TicketListPage` in `src/pages/TicketListPage.tsx` wiring `useTickets` + `TicketList` + an MUI `Pagination` control bound to `TicketPage.page`/`totalPages` (depends on T022, T027)
- [X] T029 [US1] Implement `TicketCreatePage` in `src/pages/TicketCreatePage.tsx` wiring `useCreateTicket` + `TicketForm`, navigating to the ticket list on success (depends on T023, T026); navigates to `/` rather than a ticket detail route since `TicketDetailPage` doesn't exist until T042 (Phase 4) — revisit this navigation target when Phase 4 lands
- [X] T030 [US1] Wire `/` → `TicketListPage` and `/tickets/new` → `TicketCreatePage` in `src/routes/router.tsx` (depends on T028, T029)

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - View and Update Ticket Details (Priority: P1)

**Goal**: A support agent opens a ticket, edits its title/description/priority/assignee, and moves it through its status lifecycle, with every transition validated by the backend.

**Independent Test**: Open an existing ticket, change its priority/assignee, save, and confirm the change persists; attempt a valid and an invalid status change and confirm the correct outcome for each (spec.md US2).

### Tests for User Story 2

- [X] T031 [P] [US2] Integration test: view ticket detail and update title/description/priority/assignee, values reflected immediately (FR-004) in `tests/integration/update-ticket.test.tsx`
- [X] T032 [P] [US2] Integration test (adapted): `TicketForm`'s client-side non-empty check mirrors the backend's own title/description validation exactly, so there is no reachable UI path that sends a blank title/description to the backend — the test instead verifies the client-caught empty-title error preserves the edit (FR-013) in `tests/integration/update-ticket.test.tsx`
- [X] T033 [P] [US2] Integration test (adapted): rather than an unreachable `CLOSED → OPEN` UI path (the menu never offers an invalid option), simulates the race condition from spec.md Edge Cases — ticket closes server-side after the menu is rendered — so a real `409` round-trips and is displayed without changing the shown status (FR-010, FR-011) in `tests/integration/invalid-transition.test.tsx`
- [X] T034 [P] [US2] Integration test: valid status transition (`OPEN → IN_PROGRESS`) is accepted and the new status is displayed in `tests/integration/invalid-transition.test.tsx`

### Implementation for User Story 2

- [X] T035 [P] [US2] Add MSW handlers for `GET /api/v1/tickets/{ticketId}` (200/404), `PATCH /api/v1/tickets/{ticketId}` (200/400/404/409), and `POST /api/v1/tickets/{ticketId}/transitions` (200/404/409) in `tests/msw/handlers.ts`, mirroring the real state machine so invalid transitions genuinely 409
- [X] T036 [US2] Implement `ticketsApi.getById(id)`, `ticketsApi.update(id, request: TicketUpdateRequest)`, `ticketsApi.transition(id, request: TicketTransitionRequest)` in `src/api/ticketsApi.ts`, typed per `TicketDetail`/`TicketUpdateRequest`/`TicketTransitionRequest` — `update` never sends a `status` field (depends on T011, T006, T007, T009)
- [X] T037 [US2] Implement `useTicket` hook (detail + comments query) in `src/hooks/useTicket.ts` (depends on T036)
- [X] T038 [US2] Implement `useUpdateTicket` hook (mutation, invalidates detail + list queries on success) in `src/hooks/useUpdateTicket.ts` (depends on T036)
- [X] T039 [US2] Implement `useTransitionTicket` hook (mutation via `POST .../transitions` only, invalidates detail + list queries on success, surfaces `409` verbatim without changing local state) in `src/hooks/useTransitionTicket.ts` (depends on T036)
- [X] T040 [US2] Implement `StatusTransitionMenu` component in `src/components/StatusTransitionMenu/StatusTransitionMenu.tsx`: offers only the valid next statuses per the local map (`OPEN → IN_PROGRESS, CANCELLED`; `IN_PROGRESS → RESOLVED, CANCELLED`; `RESOLVED → CLOSED`; `CLOSED` and `CANCELLED` offer none), always calls `useTransitionTicket`, and displays a `409` rejection message without applying the change locally (Constitution Principle III) (depends on T039)
- [X] T041 [US2] Extend `TicketForm` for edit mode (pre-filled values, preserves in-progress edits on save failure per FR-013) in `src/components/TicketForm/TicketForm.tsx` (depends on T026)
- [X] T042 [US2] Implement `TicketDetailPage` in `src/pages/TicketDetailPage.tsx` wiring `useTicket`, `TicketForm` (edit mode), `StatusTransitionMenu`, `StatusBadge`, `PriorityBadge` (depends on T037, T038, T040, T041)
- [X] T043 [US2] Wire `/tickets/:ticketId` → `TicketDetailPage` in `src/routes/router.tsx` (depends on T042); also updated T029's `TicketCreatePage` to navigate to this route now that it exists, resolving that phase's earlier placeholder

### Amendment for User Story 2 — read-only View page, separate Edit page, and breadcrumbs

The spec was amended to split the single detail page into a read-only
"View" page (reached via a new "View" action on the ticket list, showing
the ticket's fields plus its status-transition control and comments) and
a separate "Edit" page (fields only, reached via an "Edit" action on the
View page). Creating or saving an edit both redirect to the View page,
and every page shows breadcrumb navigation (spec.md Clarifications,
FR-003, FR-004, FR-016–FR-020; plan.md/research.md's "View/edit page
split" decision). These tasks apply on top of the already-implemented
`TicketDetailPage` (T037–T043) and its later comment-pagination rewiring
(the US3 amendment below, already done) — task numbering here reflects
grouping by story, not chronological completion order.

- [X] T044 [P] [US2] Implement generic `Breadcrumbs` component in `src/components/Breadcrumbs/Breadcrumbs.tsx`: accepts an ordered `{ label: string; to?: string }[]` prop, renders MUI `Breadcrumbs` with a React Router `Link` for each segment that has `to`, and plain `Typography` for the final/current segment (FR-020)
- [X] T045 [US2] Implement `TicketEditPage` in `src/pages/TicketEditPage.tsx`: fetches the ticket via `useTicket`, renders `Breadcrumbs` (`"Tickets" → "/"`, ticket title `→ "/tickets/{id}"`, `"Edit"`) plus `TicketForm` in edit mode wired to `useUpdateTicket`, and navigates to `/tickets/{id}` on a successful save (FR-004, FR-017, FR-019) (depends on T037, T038, T041, T044)
- [X] T046 [US2] Simplify `TicketDetailPage` in `src/pages/TicketDetailPage.tsx` to read-only: remove the inline `TicketForm`, add `Breadcrumbs` (`"Tickets" → "/"`, ticket title), add an "Edit" link to `/tickets/{id}/edit`; keep `StatusTransitionMenu`, `CommentList`, `CommentForm` as-is (FR-003) (depends on T044)
- [X] T047 [US2] Add `/tickets/:ticketId/edit` → `TicketEditPage` route in `src/routes/router.tsx` (depends on T045)
- [X] T048 [P] [US2] Add a "View" action (link to `/tickets/{id}`) per ticket row in `TicketList` component in `src/components/TicketList/TicketList.tsx` (FR-016) — the list previously had no way to open an existing ticket at all
- [X] T049 [P] [US2] Add `Breadcrumbs` (`"Tickets"`, current page, not a link) to `TicketListPage` in `src/pages/TicketListPage.tsx` (depends on T044)
- [X] T050 [P] [US2] Add `Breadcrumbs` (`"Tickets" → "/"`, `"New Ticket"`) to `TicketCreatePage` in `src/pages/TicketCreatePage.tsx` (depends on T044)
- [X] T051 [P] [US2] Integration test: clicking "View" on a ticket in the list navigates to its read-only detail page with no editable fields, and clicking "Edit" there navigates to a separate edit page with fields pre-filled (FR-003, FR-016, FR-017) in `tests/integration/view-edit-navigation.test.tsx`
- [X] T052 [US2] Integration test: saving the edit page navigates back to the read-only detail page with updated values shown, and each page's breadcrumb trail matches spec.md FR-020's examples (FR-004, FR-019, FR-020) in `tests/integration/view-edit-navigation.test.tsx` (depends on T045, T046)
- [X] T053 [US2] Update `tests/integration/update-ticket.test.tsx` to navigate via the "Edit" link/page instead of asserting an inline edit form on the detail page, since editing moved to a separate page (depends on T045, T046)
- [X] T054 [P] [US2] Re-run `tests/integration/create-ticket.test.tsx` — **assumption corrected**: the run was NOT a no-op. The new breadcrumb (T046) duplicates the ticket title text on the detail page (breadcrumb segment + `<h1>`), so `findByText("Printer is broken")` became ambiguous (`Found multiple elements`). Fixed by switching that assertion to `findByRole("heading", { name: ... })` (depends on T046)

**Checkpoint**: User Stories 1 AND 2 (with the View/Edit page split and breadcrumbs) both work independently

---

## Phase 5: User Story 3 - Add Comments to a Ticket (Priority: P2)

**Goal**: A support agent adds a comment to a ticket and sees the full, ordered comment history.

**Independent Test**: Open a ticket, submit a comment, confirm it appears in the ticket's comment history in order (spec.md US3).

### Tests for User Story 3

- [X] T055 [P] [US3] Integration test (adapted): comment appears in chronological order with its timestamp (FR-006) in `tests/integration/add-comment.test.tsx` — no author assertion; see implementation note on T060 for why
- [X] T056 [P] [US3] Integration test: empty comment is blocked client-side, no request sent (FR-006, spec.md US3 acceptance scenario 2) in `tests/integration/add-comment.test.tsx`

### Implementation for User Story 3

- [X] T057 [P] [US3] Add MSW handler for `POST /api/v1/tickets/{ticketId}/comments` (201 `CommentResponse` / 400 `ApiError`) in `tests/msw/handlers.ts`
- [X] T058 [US3] Implement `commentsApi.addComment(ticketId, request: CommentCreateRequest)` in `src/api/commentsApi.ts`, typed per `CommentCreateRequest`/`CommentResponse` — `content` required, `minLength: 1` (depends on T011, T007, T009)
- [X] T059 [US3] Implement `useAddComment` hook (mutation, invalidates the ticket detail query on success) in `src/hooks/useAddComment.ts` (depends on T058)
- [X] T060 [P] [US3] Implement `CommentList` component in `src/components/CommentList/CommentList.tsx` rendering comments in chronological (creation) order — **deviation**: renders content + timestamp only, no author. `backend-api-doc.json`'s `CommentResponse` has no author field at all (and this slice has no authentication per spec.md Assumptions), so "author" from spec.md FR-006/US3 cannot be populated from the real backend contract. This is a genuine spec-vs-backend-contract gap, not a simplification; flagging for spec.md follow-up rather than fabricating an author value.
- [X] T061 [P] [US3] Implement `CommentForm` component in `src/components/CommentForm/CommentForm.tsx`: `content` required, non-empty, blocks submission with a field error otherwise, using the shared `mapFieldErrors` utility (T010) to render any backend `400 fieldErrors` (depends on T010)
- [X] T062 [US3] Wire `CommentList` + `CommentForm` into `TicketDetailPage` in `src/pages/TicketDetailPage.tsx` (depends on T059, T060, T061, T042)

### Amendment for User Story 3 — comment listing is now a dedicated paginated endpoint

`backend-api-doc.json` was updated (spec.md Clarifications, 2026-09-21) to
add `GET /api/v1/tickets/{ticketId}/comments` returning a paginated
`CommentPage` (oldest-to-newest, default `size` 20), confirming comments
have no author field. T055–T062 above implemented comments against the
old assumption (reading `ticket.comments` from `TicketDetailResponse`,
unpaginated). These tasks correct that per plan.md/research.md's "Comment
listing" decision — see data-model.md's `CommentPage` section for the
exact shape.

- [X] T063 [P] [US3] Add `CommentPage` to `src/types/comment.ts`: `content: Comment[]`, `page: number`, `size: number`, `totalElements: number`, `totalPages: number` — per data-model.md
- [X] T064 [P] [US3] Update MSW handlers in `tests/msw/handlers.ts`: add `GET /api/v1/tickets/:ticketId/comments` returning a paginated `CommentPage` (200, oldest-to-newest, default `size` 20) / `404 ApiError` for a missing ticket; keep the existing `POST .../comments` handler (depends on T063)
- [X] T065 [US3] Implement `commentsApi.list(ticketId, params?: { page?: number; size?: number })` in `src/api/commentsApi.ts`, typed per `CommentPage`, calling `GET /api/v1/tickets/{ticketId}/comments` (depends on T011, T063)
- [X] T066 [US3] Implement `useComments` hook (TanStack Query, keyed by `["comments", ticketId, page]`, independent of the ticket-detail query) in `src/hooks/useComments.ts` (depends on T065)
- [X] T067 [US3] Update `useAddComment` hook in `src/hooks/useAddComment.ts` to invalidate the `["comments", ticketId]` query (in addition to, or instead of, `["ticket", ticketId]`) on success, so a new comment reappears without re-requesting every previously loaded page (spec.md Edge Cases) (depends on T066)
- [X] T068 [US3] Update `CommentList` in `src/components/CommentList/CommentList.tsx` to accept a `CommentPage` (or its `content`/`page`/`totalPages`) plus a page-change callback, and render an MUI `Pagination` control when `totalPages > 1` (depends on T063)
- [X] T069 [US3] Rewire `TicketDetailPage` in `src/pages/TicketDetailPage.tsx` to source the comment list from `useComments` (own `page` state) instead of `ticket.comments`, passing the page-change callback to `CommentList` (depends on T066, T068)
- [X] T070 [P] [US3] Integration test: a ticket seeded with more comments than one page shows a way to load additional pages, and all comments across pages remain visible on request (FR-006a) in `tests/integration/add-comment.test.tsx` (depends on T064, T069)

**Checkpoint**: User Stories 1, 2, AND 3 (with corrected, paginated comment listing) all work independently

---

## Phase 6: User Story 4 - Search and Filter Tickets (Priority: P3)

**Goal**: A support agent narrows the ticket list by keyword and/or status.

**Independent Test**: Enter a keyword matching one ticket's title/description and confirm only matching tickets show; select a status filter and confirm only tickets in that status show (spec.md US4).

### Tests for User Story 4

- [X] T071 [P] [US4] Integration test: keyword search narrows the list to tickets matching title/description only (FR-007, per Clarifications 2026-09-21); MSW fixture for this test seeds at least 50 tickets to reflect SC-002's scale assumption in `tests/integration/search-filter.test.tsx`
- [X] T072 [P] [US4] Integration test: status filter narrows the list to tickets in the selected status (FR-008) in `tests/integration/search-filter.test.tsx`
- [X] T073 [P] [US4] Integration test: keyword search and status filter combined narrow to the intersection (FR-009) in `tests/integration/search-filter.test.tsx`
- [X] T074 [P] [US4] Integration test: a search/filter combination matching nothing shows a "no results" state distinct from the empty-list state (FR-015) in `tests/integration/search-filter.test.tsx`

### Implementation for User Story 4

- [X] T075 [US4] Extend `useTickets` hook in `src/hooks/useTickets.ts` to accept and pass `q` and `status` query params together (depends on T022) — already satisfied: the hook takes the full `TicketListParams` (including `q`/`status`) and passes it straight to `ticketsApi.list`; no code change needed, only the call site (T078)
- [X] T076 [P] [US4] Implement `SearchBar` component (debounced keyword input) in `src/components/TicketList/SearchBar.tsx`
- [X] T077 [P] [US4] Implement `StatusFilter` component (select from `OPEN`/`IN_PROGRESS`/`RESOLVED`/`CLOSED`/`CANCELLED` plus "All") in `src/components/TicketList/StatusFilter.tsx`
- [X] T078 [US4] Wire `SearchBar` + `StatusFilter` into `TicketListPage`, combining both into the `useTickets` params, and render the "no results" state distinctly from the empty-list state (FR-015) in `src/pages/TicketListPage.tsx` (depends on T075, T076, T077, T028)

**Checkpoint**: All user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T079 [P] Add a global error `Snackbar`/`Alert` for unexpected/network failures (e.g. backend unreachable — spec.md Edge Cases) in `src/App.tsx` — scoped to silent background-refetch failures (query already has cached data, so no local `isError` UI would otherwise show it), to avoid duplicating the error Alerts each page/form already renders for a first-load or mutation failure
- [X] T080 [P] Add `package.json` scripts: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"lint"` — already present from T001/Setup; verified unchanged
- [X] T081 Ran `npm run build` (typecheck + production Vite build) successfully — 649 modules, no errors. Automated coverage of `quickstart.md`'s updated View/Edit/breadcrumb scenarios is provided by `tests/integration/view-edit-navigation.test.tsx` (T051, T052) and the updated `update-ticket.test.tsx`/`create-ticket.test.tsx`. **Not run**: the manual browser walkthrough, since no live instance of the backend from `backend-api-doc.json` is running in this environment
- [X] T082 [P] Verified: `grep -rn "\bany\b"` across `src/`/`tests/` → none; no `fetch`/`axios` call outside `src/api/`; ESLint's `@typescript-eslint/no-explicit-any: "error"` active; `git check-ignore -v .env.local` confirms it's git-ignored (Constitution Principles II, V, VI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and have no dependency on each other's business logic, but US2's `TicketDetailPage`/`TicketForm` edit mode (T041–T043) build on US1's `TicketForm`/routing (T026, T030) — implement US1 first
  - US2's View/Edit split amendment (T044–T054) touches `TicketListPage.tsx` (adding the "View" link and breadcrumbs, T048–T049) and `TicketCreatePage.tsx` (breadcrumbs, T050), both US1 files — do this amendment after US1 exists, which it already does
  - US3 (comments) integrates into `TicketDetailPage` from US2 (T042) — implement after US2, and after US2's View/Edit amendment (T046 removes `TicketDetailPage`'s inline form; T062 wires comments into the same file — both must land, in either order relative to each other, before US3 is considered complete). Its own amendment tasks (T063–T070) correct the comment list to the now-paginated backend endpoint
  - US4 (search/filter) extends `useTickets`/`TicketListPage` from US1 (T022, T028) — implement after US1; independent of US2/US3, but shares `TicketListPage.tsx` with US2's amendment (T049, T078) — sequence those two edits, don't parallelize them
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational only
- **User Story 2 (P1)**: Foundational + reuses `TicketForm`/router from US1 (T026, T030); its View/Edit amendment (T044–T054) also touches US1's `TicketListPage.tsx`/`TicketCreatePage.tsx`
- **User Story 3 (P2)**: Foundational + integrates into `TicketDetailPage` from US2 (T042, and after US2's amendment T046)
- **User Story 4 (P3)**: Foundational + extends `useTickets`/`TicketListPage` from US1 (T022, T028); shares `TicketListPage.tsx` with US2's amendment (T049)

### Within Each User Story

- Tests written first, expected to fail before implementation
- Types/API client before hooks
- Hooks before components that consume them
- Components before the page that wires them
- Page before router wiring

### Parallel Opportunities

- T002–T005 (Setup) in parallel
- T006–T009, T012, T015, T016 (Foundational) in parallel
- T017–T019 (US1 tests) in parallel; T024–T025 (US1 badges) in parallel
- T031–T034 (US2 tests) in parallel
- T048–T050 (US2 amendment: list "View" link, list breadcrumbs, create-page breadcrumbs) in parallel — different files; T044 (Breadcrumbs component) is a dependency of T049/T050 but can run alongside T048 (no shared file)
- T055–T056 (US3 tests) in parallel; T060–T061 (US3 components) in parallel
- T063–T064 (US3 amendment: type + MSW handler) in parallel
- T071–T074 (US4 tests) in parallel; T076–T077 (US4 components) in parallel
- Once Foundational completes, US1 and (with the noted reuse points) US4 can proceed in parallel with different developers; US2 and US3 are best sequenced after US1 due to the reuse points above

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Integration test: create-ticket success path in tests/integration/create-ticket.test.tsx"
Task: "Integration test: create-ticket validation-error path in tests/integration/create-ticket.test.tsx"
Task: "Integration test: ticket list renders title/status/priority/assignee in tests/integration/ticket-list.test.tsx"

# Launch independent presentational components for User Story 1 together:
Task: "Implement StatusBadge component in src/components/StatusBadge/StatusBadge.tsx"
Task: "Implement PriorityBadge component in src/components/PriorityBadge/PriorityBadge.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Create and List Tickets)
4. **STOP and VALIDATE**: Run `tests/integration/create-ticket.test.tsx` and `ticket-list.test.tsx`; manually create a ticket and confirm it lists (quickstart.md scenario 1)
5. Deploy/demo if ready — this alone satisfies "Ticket can be created from UI" and "Tickets can be listed" from the application requirements' acceptance criteria

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → test independently → demo (MVP)
3. Add US2 → test independently → demo (adds view/update/status transitions)
4. Add US3 → test independently → demo (adds comments)
5. Add US4 → test independently → demo (adds search/filter)
6. Polish (Phase 7)

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: User Story 1, then User Story 2 (reuses US1's `TicketForm`/router)
- Developer B: User Story 4 once US1's `useTickets`/`TicketListPage` land
- Developer C: User Story 3 once US2's `TicketDetailPage` lands

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
