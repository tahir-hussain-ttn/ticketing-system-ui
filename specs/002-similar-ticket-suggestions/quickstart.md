# Quickstart: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

Validates this feature end-to-end against the acceptance scenarios in
[spec.md](./spec.md). See [data-model.md](./data-model.md) for field
shapes and [contracts/README.md](./contracts/README.md) for the endpoints
each step exercises (note: several are `Assumed`, pending backend
confirmation — see contracts/README.md and research.md).

## Prerequisites

- Node.js 20 LTS, npm.
- Either:
  - A running instance of the backend implementing
    `ticketing-system/specs/005-auth-rag-chatbot/spec.md` at
    `http://localhost:8080` (real end-to-end run) — seeded with at least
    one `SUPPORT`, one `GENERAL`, and one `ADMIN` user, and at least one
    resolved ticket for the chatbot to ground answers in, **or**
  - No backend running (the test suite uses MSW-mocked responses — see
    `tests/msw/`).
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
backend-rejection-path test per US1–US5 (per the constitution's
Development Workflow gate).

## Manual validation scenarios

1. **Log in and out (US1)** — Open the app while signed out. Expect:
   redirected to `/login` regardless of the URL requested. Submit a wrong
   password: expect one generic "invalid credentials" message. Submit with
   the email blank: expect a field-level validation error, no request
   sent. Log in with valid credentials: expect landing on the ticket list.
   Log out: expect return to `/login`, and any protected URL typed
   directly redirects back to `/login`.
2. **Automatic assignment and reassignment (US2)** — As any signed-in
   role, create a ticket. Expect: no assignee field on the create form.
   Open its detail page: expect the system-assigned `SUPPORT` user's name
   shown (or "Unassigned"). As an `ADMIN`, use the reassignment control to
   pick a different `SUPPORT` user: expect the displayed assignee to
   update. As a non-`ADMIN`, confirm no reassignment control appears. If
   reachable, force a reassignment failure (e.g. stop the backend
   mid-request): expect an inline error near the control with the
   attempted selection still showing, not a reverted/cleared control.
3. **Chatbot widget (US3)** — On any page, expect the chatbot shown
   collapsed (a small button/icon), not expanded. Open it and submit a
   query closely matching a seeded resolved ticket's issue: expect a
   response citing that ticket as plain text (not a clickable link).
   Navigate to a different page: expect the widget and its conversation
   still available. Ask a follow-up referencing the first query: expect
   the response to reflect that context. Submit a query with no good
   match: expect a clear "no confident match" message pointing to manual
   ticket creation.
4. **Comments and authorship (US4)** — On a ticket's detail page as its
   creator or assigned `SUPPORT` user, submit a comment: expect it shown
   with your name. As a different signed-in user permitted to view the
   ticket but not comment on it, confirm the comment form is unavailable
   or a submission attempt is clearly rejected.
5. **Ownership scope and view authorization (US5)** — On the ticket list,
   select "created by me," "assigned to me" (if `SUPPORT`/`ADMIN`), and
   "all" in turn: expect each to show only the matching tickets, and
   expect a `GENERAL` user's list to omit "assigned to me" entirely.
   Confirm the list shows a creator-name column. As a `GENERAL` user,
   navigate directly to a ticket you neither created nor are assigned to:
   expect a clear "not permitted to view this ticket" state instead of
   its details.

## Success criteria mapping

- SC-001 → Manual scenario 1 (redirect-to-login coverage).
- SC-002 → Manual scenario 5 (ownership-scope filter timing).
- SC-003 → Automated comment-authorization integration test
  (`tests/integration/comment-authorization.test.tsx`).
- SC-004 → Manual scenario 3 + automated `chatbot-widget.test.tsx` timing
  assertion.
- SC-005 → Manual scenario 3 (no-confident-match path).
- SC-006 → Automated view-authorization assertions in
  `ownership-scope-filter.test.tsx`.
- SC-007 → Manual review of rendered DOM, `sessionStorage`, and console/
  network logs during scenario 1 (no plaintext password anywhere after
  submission).
