# Implementation Plan: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

**Branch**: `002-similar-ticket-suggestions` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-similar-ticket-suggestions/spec.md`

## Summary

Add login/logout and route protection; replace caller-set ticket assignment
with a read-only, system-assigned display plus an `ADMIN`-only reassignment
control; add a persistent, collapsed-by-default chatbot widget available on
every page for AI-suggested resolutions grounded in past tickets; show named
comment authorship with creator/assignee-only commenting; and add
ownership-scoped ticket listing with a new creator column and restricted
single-ticket view. This is a frontend-only change consuming the backend
capabilities defined in `ticketing-system/specs/005-auth-rag-chatbot/spec.md`
(sibling repo) — no business logic (auth, assignment, retrieval, grounding)
is re-implemented here.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict` mode, existing project setting)

**Primary Dependencies**: React 18.3 (functional components/hooks only,
Constitution I), React Router v6.28, TanStack Query v5, MUI (Material UI)
v6 + Emotion (Constitution's Material Design mandate) — all already in use;
no new runtime dependency is required for this feature.

**Storage**: N/A (frontend only). Session token held in memory + mirrored to
`sessionStorage` for reload survival within a tab (see research.md, "Session
handling").

**Testing**: Vitest + React Testing Library + MSW (existing pattern in
`tests/`).

**Target Platform**: Web SPA, evergreen browsers, built/served via Vite
(existing).

**Project Type**: Single frontend project (this repository consumes an
external backend; no `backend/` directory exists or is added here).

**Performance Goals**: Chatbot response rendered within 5s under normal
conditions (SC-004); ticket-list ownership-scope filtering usable within 15s
for a 50-ticket list (SC-002) — both UI-perceived, no new client-side
computation heavy enough to be a bottleneck.

**Constraints**: TypeScript strict, no `any` (Constitution II); all backend
calls through the typed API client layer (Constitution V); no secrets/tokens
hardcoded or committed (Constitution VI — the session token is a runtime
value, never a committed secret); Material Design components only
(constitution's stack section); keyboard-operable, accessibly labeled
controls for the new login form, reassignment control, and chatbot widget
(constitution's accessibility clause).

**Scale/Scope**: 5 user stories; 1 new page (login); 1 new persistent
widget (chatbot); edits to 4 existing pages (create, edit, detail, list);
~6 new API-consuming hooks; no change to ticket volume assumptions from
spec 001 (tens to low hundreds of tickets).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Functional Components Only | All new UI (LoginPage, ChatbotWidget, ReassignControl, ProtectedRoute) is functional components + hooks; auth/chatbot state via `useState`/`useReducer` + Context, no class components | PASS |
| II. TypeScript Strict Typing | New domain types (`User`, `Role`, `ChatbotConversation`, `ChatbotTurn`) added to `src/types/`; `Ticket`/`Comment` extended, not re-declared ad hoc; no `any` | PASS |
| III. Backend-Driven State Machine Trust | Reassignment and auth state changes are never applied optimistically before the backend confirms them (FR-011/FR-011a); ticket status lifecycle untouched by this feature | PASS |
| IV. Meaningful Error Feedback | Every new action (login, reassignment, chatbot query, comment authorization) has an explicit failure-path requirement in spec.md (FR-003/004/011a/017/018/023) | PASS |
| V. Typed API Contract Layer | All new backend calls go through new `src/api/authApi.ts`, `src/api/usersApi.ts`, `src/api/chatbotApi.ts`, plus additions to `src/api/ticketsApi.ts`/`commentsApi.ts` — no ad hoc `fetch` in components | PASS |
| VI. No Secrets in Client Code | Session token is a runtime value obtained via login, held in memory + `sessionStorage`, never hardcoded or committed; API base URL continues to use existing `src/config/env.ts` pattern | PASS |

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-similar-ticket-suggestions/
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
├── api/
│   ├── http.ts               # MODIFY: attach Authorization header, dispatch session-expired event on 401
│   ├── ticketsApi.ts          # MODIFY: no assignee in create request; add reassign call
│   ├── commentsApi.ts         # unchanged shape, still typed per Comment
│   ├── authApi.ts             # NEW: login, logout
│   ├── usersApi.ts            # NEW: list SUPPORT-role users (for reassignment)
│   └── chatbotApi.ts          # NEW: submit chatbot query
├── auth/
│   └── session.ts              # NEW: token get/set/clear + sessionStorage mirror + expiry pub/sub
├── context/
│   ├── AuthContext.tsx         # NEW: signed-in user/role, login()/logout(), consumes auth/session.ts
│   └── ChatbotContext.tsx      # NEW: widget open/closed + current conversation state
├── routes/
│   ├── router.tsx               # MODIFY: add /login, wrap protected routes
│   └── ProtectedRoute.tsx      # NEW: redirect to /login when signed out
├── pages/
│   ├── LoginPage.tsx            # NEW
│   ├── TicketCreatePage.tsx     # MODIFY: no assignee field
│   ├── TicketEditPage.tsx       # MODIFY: no assignee field
│   ├── TicketDetailPage.tsx     # MODIFY: assignee display, ReassignControl (ADMIN-only), comment-form gating, "not permitted" state
│   └── TicketListPage.tsx       # MODIFY: creator column, ownership-scope selector
├── components/
│   ├── ChatbotWidget/
│   │   ├── ChatbotWidget.tsx    # NEW: collapsed FAB + expanded conversation panel
│   │   └── ChatbotConversationView.tsx  # NEW: turn list, input, citations
│   ├── ReassignControl/
│   │   └── ReassignControl.tsx  # NEW: ADMIN-only dropdown + inline error-on-failure
│   └── TicketList/
│       └── TicketList.tsx       # MODIFY: creator column
├── hooks/
│   ├── useLogin.ts               # NEW
│   ├── useLogout.ts              # NEW
│   ├── useSupportUsers.ts        # NEW
│   ├── useReassignTicket.ts      # NEW
│   ├── useChatbotQuery.ts        # NEW
│   └── (existing ticket/comment hooks, minor type updates only)
├── types/
│   ├── user.ts                   # NEW: User, Role
│   ├── chatbot.ts                # NEW: ChatbotConversation, ChatbotTurn
│   ├── ticket.ts                 # MODIFY: assignee/creator as User references
│   └── comment.ts                # MODIFY: add author (User reference)
└── config/
    └── assignees.ts               # REMOVE: superseded by useSupportUsers (backend-sourced)

tests/
├── msw/handlers.ts                # MODIFY: add auth, users, reassign, chatbot handlers
├── integration/
│   ├── login.test.tsx             # NEW
│   ├── protected-route.test.tsx   # NEW
│   ├── reassign-ticket.test.tsx   # NEW
│   ├── chatbot-widget.test.tsx    # NEW
│   ├── comment-authorization.test.tsx  # NEW
│   ├── ownership-scope-filter.test.tsx # NEW
│   └── (existing create/update/view-edit-navigation tests, updated for new types)
```

**Structure Decision**: Single frontend project (existing layout retained,
per spec 001's precedent) — this repository is the frontend only; the
backend implementing spec `005-auth-rag-chatbot` lives in the sibling
`ticketing-system` repository and is out of scope for changes here.

## Complexity Tracking

*No Constitution Check violations — this section is not needed.*
