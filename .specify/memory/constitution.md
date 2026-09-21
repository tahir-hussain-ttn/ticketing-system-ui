<!--
Sync Impact Report
Version change: none (template) → 1.0.0
Rationale: initial ratification, no prior constitution existed.
Modified principles: n/a (all newly defined)
Added sections:
  - Core Principles I-VI (Functional Components Only, TypeScript Strict Typing,
    Backend-Driven State Machine Trust, Meaningful Error Feedback, Typed API
    Contract Layer, No Secrets in Client Code)
  - Frontend Technology Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none (placeholders only)
Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending manual check (not modified by this command)
  - .specify/templates/spec-template.md ⚠ pending manual check (not modified by this command)
  - .specify/templates/tasks-template.md ⚠ pending manual check (not modified by this command)
Deferred TODOs: none
-->

# Ticketing System UI Constitution

## Core Principles

### I. Functional Components Only
All React components MUST be written as functional components using hooks;
class components MUST NOT be introduced. Component state and side effects
MUST use `useState`, `useReducer`, `useEffect`, and custom hooks rather than
lifecycle-method equivalents. Shared logic (e.g. ticket fetching, form
validation, search/filter state) MUST be extracted into custom hooks instead
of higher-order components or render-prop patterns.

Rationale: the project mandate is a functional-component TypeScript React
codebase; consistency here keeps the component model predictable and avoids
mixing two different state paradigms.

### II. TypeScript Strict Typing
The project MUST run TypeScript in `strict` mode. `any` MUST NOT be used
except at a justified, commented boundary (e.g. an untyped third-party
module). Every component's props, every hook's return value, and every API
request/response MUST have an explicit type or interface. Ticket domain
types (ticket, status, priority, comment, assignee) MUST be defined in a
single shared types module and imported everywhere, never re-declared
ad hoc.

Rationale: a ticket's status is state-machine-governed and shared across
list, detail, and update views; one canonical type definition prevents
drift and catches invalid status values at compile time.

### III. Backend-Driven State Machine Trust (NON-NEGOTIABLE)
The UI MUST treat the backend as the sole authority for the ticket status
state machine (`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, with `CANCELLED`
reachable from `OPEN` and `IN_PROGRESS`). The frontend MAY restrict which
transitions it *offers* in the UI as a usability aid, but MUST NOT assume a
transition succeeded before the backend confirms it, and MUST NOT silently
swallow or "correct" a rejected transition. Every transition attempt MUST go
through the API and MUST surface the backend's accept/reject response to the
user.

Rationale: invalid transitions (e.g. `CLOSED → OPEN`) must be rejected by
the backend per the application requirements; the UI duplicating that logic
without staying in sync would risk allowing an invalid transition to appear
to succeed.

### IV. Meaningful Error Feedback
Every user-facing action (create, update, comment, search, filter, status
transition) MUST handle failure paths explicitly. Validation errors and
rejected transitions returned by the backend MUST be displayed in the UI in
plain language tied to the field or action that failed, not as raw HTTP
status codes or stack traces. Loading, empty, and error states MUST each be
handled distinctly in list and detail views.

Rationale: "UI shows meaningful errors" and "backend validation works" are
explicit acceptance criteria; an error the user cannot understand or act on
does not satisfy them.

### V. Typed API Contract Layer
All backend communication MUST go through a single, typed API client module
(no ad hoc `fetch`/`axios` calls scattered across components). Each API
function MUST declare its request and response types, matching the shared
domain types from Principle II. Components MUST consume API data through
hooks or service functions, never by embedding request logic directly in a
component body.

Rationale: centralizing API access makes the state-machine and validation
contracts easy to audit in one place and keeps components focused on
rendering.

### VI. No Secrets in Client Code
No API keys, tokens, credentials, or environment-specific secrets MUST be
committed to the repository or hardcoded in source. Configuration that
varies by environment (API base URL, etc.) MUST be read from environment
variables or build-time config, and any `.env` file containing real values
MUST be git-ignored.

Rationale: "No secrets are committed" is an explicit acceptance criterion;
client-side code is fully exposed to end users, so this is a hard
requirement, not a preference.

## Frontend Technology Stack & Constraints

- Language: TypeScript (strict mode), no JavaScript source files.
- Framework: React, functional components and hooks only (Principle I).
- UX: The project should strictly use Material design theme and components
- Ticket UI MUST cover: create ticket, list tickets, view ticket detail,
  update title/description/priority/assignee, add comments, keyword search,
  status filter — matching the application requirements' acceptance
  criteria.
- Styling and state-management library choices are not constitutionally
  fixed, but any addition MUST be justified against added complexity
  (see Development Workflow gate below).
- Accessibility: interactive elements (status changes, form submission,
  search, filters) MUST be operable via keyboard and expose accessible
  labels, since ticket triage is an operational workflow tool.

## Development Workflow & Quality Gates

- Every change touching ticket create/update/comment/search/filter flows
  MUST include or update tests exercising both the success path and at
  least one rejected/error path (e.g. an invalid status transition rejected
  by the backend, a failed validation).
- Pull requests MUST NOT introduce `any`, class components, or direct
  fetch/axios calls outside the API client layer without an explicit,
  reviewed justification comment.
- New dependencies MUST be justified in the PR description: what problem it
  solves and why existing project code or the standard library is
  insufficient.
- Before marking UI work for a feature complete, the golden path and at
  least one edge case MUST be manually exercised in a running browser
  session, not just verified via type-checking or unit tests.

## Governance

This constitution supersedes ad hoc conventions for this repository. All
pull requests and code reviews MUST verify compliance with the Core
Principles above; a reviewer MUST reject or request changes on a PR that
knowingly violates a NON-NEGOTIABLE principle (Principle III) without a
documented, approved exception.

Amendment procedure:
1. Propose the change (new/modified/removed principle or section) with
   rationale.
2. Update this file, following the versioning policy below.
3. Record the change in a Sync Impact Report comment at the top of this
   file at the time of amendment.

Versioning policy (semantic versioning applied to this document):
- MAJOR: backward-incompatible governance change, or removal/redefinition
  of an existing principle.
- MINOR: a new principle or section added, or existing guidance materially
  expanded.
- PATCH: wording, clarification, or typo fixes with no semantic change.

Compliance review: constitution compliance MUST be checked as part of PR
review, and any complexity that appears to conflict with a principle MUST
be explicitly justified in the PR description or the change MUST be
revised to comply.

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
