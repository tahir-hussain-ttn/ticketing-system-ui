# Quickstart: Support Ticket Management UI

Validates the feature end-to-end against the acceptance scenarios in
[spec.md](./spec.md). See [data-model.md](./data-model.md) for field
shapes and [contracts/README.md](./contracts/README.md) for the endpoints
each step exercises.

## Prerequisites

- Node.js 20 LTS, npm.
- Either:
  - A running instance of the backend described in `backend-api-doc.json`
    at `http://localhost:8080` (real end-to-end run), **or**
  - No backend running (the app's test suite uses MSW-mocked responses —
    see `tests/msw/`).
- `VITE_API_BASE_URL` set in `.env.local` (git-ignored) to the backend's
  base URL, e.g. `http://localhost:8080`.

## Setup

```bash
npm install
npm run dev        # starts the SPA against VITE_API_BASE_URL
```

## Automated validation

```bash
npm run test        # Vitest + React Testing Library + MSW, unit + integration
npm run typecheck    # tsc --noEmit, strict mode
```

Expected: all tests pass, including at least one success-path and one
backend-rejection-path test per US1–US4 (per the constitution's
Development Workflow gate).

## Manual validation scenarios

1. **Create and list (US1)** — Open the app, click "New Ticket", fill in
   title/description/priority, submit. Expect: redirected to the ticket
   list (or detail), new ticket visible with status `OPEN`. Submit again
   with title left empty: expect a field-level error, no request sent to
   the backend that would otherwise reject it.
2. **View and update (US2)** — Open the created ticket, edit its priority
   and assignee (from the dropdown), save. Expect: updated values shown
   immediately. Attempt an invalid status change no menu currently offers
   by re-selecting an already-terminal ticket's status control if
   available; otherwise verify via a `CLOSED` ticket that no forward
   transition is offered, and that any attempt still round-trips through
   the backend rather than changing the badge optimistically.
3. **Add comment (US3)** — On the ticket detail view, submit a comment.
   Expect: comment appears at the bottom of the comment history with its
   timestamp (no author shown — this slice has no user identity). Submit
   an empty comment: expect a validation error, no new comment added. On
   a ticket seeded with more comments than one page (backend default page
   size 20), expect a way to load additional pages rather than the whole
   history loading at once (FR-006a).
4. **Search and filter (US4)** — On the ticket list, enter a keyword
   matching one ticket's title; expect only that ticket shown. Clear it,
   select a status filter; expect only tickets in that status shown.
   Combine both; expect the intersection. Search for a keyword matching
   nothing; expect a "no results" state distinct from the empty-list state
   shown before any ticket exists.

## Success criteria mapping

- SC-001 → Manual scenario 1 (create-to-visible-in-list time).
- SC-002 → Manual scenario 4 (find a known ticket via search/filter).
- SC-003 → Automated invalid-transition integration test
  (`tests/integration/invalid-transition.test.tsx`).
- SC-004 → Automated validation-error integration tests across
  create/update/comment.
- SC-005 → Manual scenarios 1 + 3 run by a first-time reviewer.
