# Feature Specification: Frontend for Authenticated Ticketing with RAG Resolution Chatbot

**Feature Branch**: `002-similar-ticket-suggestions`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description (2026-09-22, original): "Identify the potential for
integrating AI with RAG in this ticketing system application. Selected way
forward: on ticket creation and on the ticket detail page, retrieve similar
past tickets and surface their resolutions as suggestions to the agent."

**Amendment (2026-09-24)**: "Update the specifications 002 by identifying the
frontend requirements from backend application specs at
`ticketing-system/specs/005-auth-rag-chatbot/spec.md`." That backend spec is
the actual, authoritative RAG feature that was designed and is being built:
email/password login with roles (`SUPPORT`/`GENERAL`/`ADMIN`); login-gated
access to nearly every API; automatic least-loaded-`SUPPORT` ticket
assignment with `ADMIN`-only manual reassignment; creator/assignee-only
commenting with named attribution; ownership-scoped ticket listing;
creator/assignee/`SUPPORT`/`ADMIN`-only single-ticket view; and a
customer-facing chatbot that answers from a knowledge base of past resolved
tickets, with multi-turn conversation and source citation. This supersedes
this spec's original, speculative "agent-facing suggestion panel" concept,
which the backend was never built to support — this revision replaces that
scope with the frontend surface the real backend requires.

## Clarifications

### Session 2026-09-22 (original, now superseded by the 2026-09-24 amendment)

- Q: When should similar-ticket suggestions be shown to the agent? → A:
  *(superseded — the backend implements a dedicated chatbot interface, not
  inline creation/detail-page suggestions; see below)*
- Q: What should a suggestion contain? → A: *(superseded — see chatbot
  response requirements below)*
- Q: Should agents be able to give feedback on suggestion quality? → A:
  *(superseded — no such feedback mechanism exists in the backend spec; not
  carried forward)*

### Session 2026-09-24 (post-amendment)

- Q: Should the chatbot be a dedicated page or a persistent widget available
  from every page? → A: Persistent widget, available from every page
  (including while viewing or creating a ticket), not a separate navigable
  section.
- Q: Should a chatbot citation to a ticket the viewer cannot open be a plain
  reference or a clickable link? → A: Plain, non-clickable reference (e.g.
  "Ticket #4821") — never a link, regardless of role.
- Q: Should a GENERAL-role user (never an assignee) still see the "assigned
  to me" ownership-scope option? → A: No — hide that option for the
  GENERAL role; it offers only "created by me" and "all."

### Session 2026-09-24 (post-amendment, /speckit-clarify)

- Q: Should the chatbot widget be collapsed or expanded by default on every
  page load? → A: Collapsed by default — a small button/icon the user
  clicks to open it.
- Q: What should the UI do when an ADMIN's reassignment attempt fails? → A:
  Show an inline error near the reassignment control and keep it open with
  the attempted selection still showing, so the ADMIN can retry without
  reselecting from scratch.
- Q: Should the ticket list show each ticket's creator name as its own
  column? → A: Yes — add creator's name alongside the existing title/
  status/priority/assignee columns.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log In and Out (Priority: P1)

A person opens the application and must log in with their email and
password before they can do anything else — create a ticket, view a ticket,
comment, or use the chatbot. They can explicitly log out when done, after
which they are treated as signed out until they log in again.

**Why this priority**: The backend rejects every request except login
itself from an unauthenticated caller. Without a login screen, no other
part of the frontend is reachable at all.

**Independent Test**: Load the application while signed out and confirm
every action (ticket list, ticket creation, chatbot) is unreachable and
routes to a login prompt. Log in with valid credentials and confirm normal
access. Log in with an invalid password and confirm a clear rejection with
no access granted. Log out and confirm access is revoked again.

**Acceptance Scenarios**:

1. **Given** the application is opened with no active session, **When** any
   page other than login is requested, **Then** the user is redirected to
   the login page.
2. **Given** the login page, **When** the user submits a registered email
   and correct password, **Then** they are signed in and taken to the
   ticket list.
3. **Given** the login page, **When** the user submits an incorrect
   password or an unregistered email, **Then** the system displays a single
   generic "invalid credentials" message (not revealing which field was
   wrong) and does not sign the user in.
4. **Given** the login page, **When** the user submits the form with the
   email or password left blank, **Then** the system displays a
   field-specific validation error distinct from the invalid-credentials
   message, without contacting the backend.
5. **Given** a signed-in user, **When** they choose "log out," **Then**
   their session ends, they are returned to the login page, and any
   subsequent attempt to reach a protected page redirects back to login.
6. **Given** a signed-in user's session has ended (e.g. expired) while they
   are on a protected page, **When** they next take an action that calls
   the backend, **Then** the system treats the rejected call as a sign-out
   and returns them to the login page rather than showing a raw error.

---

### User Story 2 - See Automatic Assignment, and Reassign as Admin (Priority: P1)

A signed-in user creates a ticket without choosing an assignee — the
system picks the `SUPPORT` user automatically. Anyone viewing the ticket
sees who it is currently assigned to, including "unassigned" if no
`SUPPORT` user existed yet. A user with the `ADMIN` role can change that
assignment; no one else can.

**Why this priority**: This is a direct, breaking change to the existing
create/edit UI (assignee is no longer a field the caller sets) and to the
detail page. It must land alongside login since assignment is now tied to
authenticated roles.

**Independent Test**: As any signed-in role, create a ticket and confirm no
assignee field is offered on the create form, and the resulting detail page
shows the system-chosen assignee (or "Unassigned"). As an `ADMIN`, use the
reassignment control on the detail page and confirm the assignee changes.
As a non-`ADMIN`, confirm no reassignment control is shown or usable.

**Acceptance Scenarios**:

1. **Given** the create-ticket form, **When** any signed-in user views it,
   **Then** it offers title, description, and priority only — no assignee
   field is present.
2. **Given** a newly created ticket, **When** its detail page is viewed,
   **Then** the system-assigned `SUPPORT` user's name is displayed, or a
   clear "Unassigned" state if none was available at creation.
3. **Given** a ticket's detail page, **When** the viewer has the `ADMIN`
   role, **Then** a reassignment control is available, offering the current
   list of `SUPPORT` users to reassign the ticket to.
4. **Given** the `ADMIN` reassignment control, **When** an `ADMIN` selects a
   different `SUPPORT` user and confirms, **Then** the ticket's displayed
   assignee updates to reflect the change.
4a. **Given** the `ADMIN` reassignment control, **When** a reassignment
   attempt fails, **Then** the system shows an inline error near the
   control and keeps it open with the attempted selection still showing,
   so the `ADMIN` can retry without reselecting from scratch.
5. **Given** a ticket's detail page, **When** the viewer does not have the
   `ADMIN` role, **Then** no reassignment control is shown.
6. **Given** the ticket edit page (title/description/priority), **When**
   any signed-in user opens it, **Then** it MUST NOT offer a way to change
   the assignee — reassignment exists only as the `ADMIN`-only detail-page
   control from Scenario 3.

---

### User Story 3 - Ask the Chatbot for a Resolution, from Anywhere (Priority: P1)

A signed-in user opens a persistent chatbot widget available on every page
— including while browsing the ticket list, viewing a ticket, or filling in
the create-ticket form — and describes a problem in their own words. They
receive an answer grounded in how a similar past ticket was actually
resolved, with a plain-text reference to the ticket(s) it came from. They
can ask follow-up questions in the same conversation, and the widget stays
available (and keeps its conversation) as they navigate between pages.

**Why this priority**: This is the core value of the RAG feature — an
instant, grounded answer instead of manually searching or filing a ticket.
It is P1 because the backend chatbot has never existed disconnected from
login, and this is the feature's headline capability. Making it a
persistent widget (not a separate page) maximizes when a user actually
reaches for it, including mid-triage on a ticket page.

**Independent Test**: As a signed-in user, open the widget from the ticket
list, submit a query closely matching a known resolved ticket's issue, and
confirm the response reflects that ticket's resolution and cites it as
plain text (not a link). Navigate to a different page and confirm the
widget and its conversation are still available. Ask a follow-up
referencing the first question and confirm the response accounts for that
context. Submit a query with no good match and confirm the system says so
and points to manual ticket creation.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** it first loads, **Then**
   the chatbot widget is shown collapsed (a small button/icon), not
   expanded, until the user clicks it open.
2. **Given** any page in the application, **When** a signed-in user opens
   the chatbot widget and submits a free-text query describing an issue,
   **Then** the system displays a response grounded in the most relevant
   past resolved ticket(s), citing which ticket(s) it came from as a plain,
   non-clickable reference (e.g. "Ticket #4821") — never a link.
3. **Given** an ongoing chatbot conversation, **When** the user submits a
   follow-up query referencing something asked earlier, **Then** the
   displayed response reflects that earlier context, and the full
   conversation (prior turns and the new one) remains visible.
4. **Given** an open chatbot widget with an ongoing conversation, **When**
   the user navigates to a different page, **Then** the widget remains
   available and its conversation history is unchanged.
5. **Given** the chatbot widget, **When** the user submits an empty or
   blank query, **Then** the system prevents submission and shows a clear
   validation message without contacting the backend.
6. **Given** no past resolved ticket is a close enough match, **When** the
   user submits that query, **Then** the response clearly states no
   confident match was found and directs the user to the ticket-creation
   page, without implying a ticket was filed automatically.
7. **Given** the chatbot service is unavailable or times out, **When** the
   user submits a query, **Then** the system displays a clear
   service-unavailable message distinct from the "no confident match"
   message.
8. **Given** an active chatbot conversation, **When** the user explicitly
   ends it, or 30 minutes pass with no new query, **Then** the next query
   the user sends starts a new conversation rather than continuing the
   prior one, and the system reflects this in the displayed conversation
   view.
9. **Given** a chatbot response, **When** it is displayed, **Then** it
   contains only the reworded, customer-safe resolution text and cited
   ticket reference(s) — never raw internal comment text or any customer/
   agent identifying detail from the source ticket(s).

---

### User Story 4 - See Who Commented, and Comment Only If Allowed (Priority: P2)

A signed-in user views a ticket's comments and sees who wrote each one. If
they created the ticket or are its assigned `SUPPORT` user, they can add a
comment; otherwise the option to comment is unavailable or clearly refused.

**Why this priority**: Builds on login (Story 1) and assignment (Story 2)
to make the existing comment feature attributable and access-controlled;
the ticket lifecycle already works without it.

**Independent Test**: As a ticket's creator, add a comment and confirm it
shows your name. As the assigned `SUPPORT` user, add a comment and confirm
it shows your name. As an unrelated signed-in user permitted to view the
ticket (e.g. `SUPPORT`/`ADMIN` per Story 5), confirm any attempt to comment
is rejected with a clear message.

**Acceptance Scenarios**:

1. **Given** a ticket's comment history, **When** it is displayed, **Then**
   each comment shows the name of the user who created it.
2. **Given** a ticket's detail page, **When** the viewer is that ticket's
   creator or its currently assigned `SUPPORT` user, **Then** the comment
   form is available and a submitted comment succeeds.
3. **Given** a ticket's detail page, **When** the viewer is signed in but is
   neither the ticket's creator nor its assignee, **Then** attempting to
   comment is rejected with a clear authorization message, and no comment
   is added.

---

### User Story 5 - Filter the Ticket List by Ownership, with Restricted Single-Ticket View (Priority: P3)

A signed-in user narrows the ticket list to tickets they created, tickets
assigned to them, or every ticket they are allowed to see. Opening a
specific ticket they are not permitted to view (per the same rule) is
clearly refused rather than shown.

**Why this priority**: A convenience/efficiency and access-control
refinement on top of the existing ticket list and detail view; the system
is usable without it once Stories 1–2 exist.

**Independent Test**: As a user with both created and assigned tickets,
select each ownership scope in turn and confirm only the matching tickets
appear, including combined with an existing keyword/status filter. As a
`GENERAL` user, attempt to open a ticket you neither created nor are
assigned to (e.g. via a direct link) and confirm access is refused.

**Acceptance Scenarios**:

1. **Given** the ticket list, **When** it is displayed, **Then** each row
   shows that ticket's creator name as its own column, alongside title,
   status, priority, and assignee.
2. **Given** the ticket list, **When** the user selects "created by me,"
   **Then** only tickets they created are shown.
4. **Given** the ticket list, **When** a `SUPPORT` user selects "assigned to
   me," **Then** only tickets currently assigned to them are shown.
5. **Given** the ticket list, **When** the signed-in user has the `GENERAL`
   role, **Then** the "assigned to me" scope option is not shown — only
   "created by me" and "all" are offered, since a `GENERAL` user is never an
   assignee.
6. **Given** the ticket list, **When** the user selects "all," **Then**
   every ticket they are permitted to see is shown (every ticket, for
   `SUPPORT`/`ADMIN`; only tickets they created, for `GENERAL`).
7. **Given** an ownership scope and an existing keyword or status filter are
   both set, **When** the list is viewed, **Then** only tickets matching
   all of them together are shown.
8. **Given** a ticket a `GENERAL` user neither created nor is assigned to,
   **When** that user navigates to its detail page (directly or via a
   link), **Then** the system displays a clear "not permitted to view this
   ticket" state instead of the ticket's details.

---

### Edge Cases

- What happens when a ticket is created but no `SUPPORT` user exists yet?
  The detail page MUST show a clear "Unassigned" state rather than a blank
  or broken field.
- What happens when the `ADMIN` reassignment control is opened but no
  `SUPPORT` users exist? It MUST show a clear "no support users available"
  state rather than an empty, unexplained dropdown.
- What happens when a signed-in user's role does not permit an action they
  attempt through the UI directly (e.g. a crafted request to reassign)?
  The backend's rejection MUST be surfaced as a clear authorization message,
  not a generic or silent failure.
- What happens when a chatbot query is submitted immediately after signing
  in, before any conversation exists? A new conversation MUST start
  automatically — the user is never required to explicitly create one.
- What happens when the user is mid-conversation with the chatbot and their
  session expires? The next query MUST be treated as Story 1 Scenario 6
  (redirect to login), not silently dropped.
- What happens when a ticket's comment list is being viewed by its creator,
  and that same ticket is reassigned to a different `SUPPORT` user while
  they watch? The creator's ability to comment MUST be unaffected by the
  reassignment (they still qualify as "creator").
- What happens when the login form is resubmitted rapidly (e.g. double
  click)? The system MUST NOT submit duplicate login requests or show
  duplicate error messages.

## Requirements *(mandatory)*

### Functional Requirements

**Login & session**

- **FR-001**: The system MUST provide a login form accepting an email
  address and password, reachable without an active session.
- **FR-002**: The system MUST redirect any request for a page other than
  login to the login page when no active session exists.
- **FR-003**: The system MUST display a single generic invalid-credentials
  message when login is rejected for a wrong password or unregistered
  email, without indicating which one was wrong.
- **FR-004**: The system MUST display a field-specific validation message,
  without contacting the backend, when the login form is submitted with the
  email or password left blank.
- **FR-005**: The system MUST provide a way for a signed-in user to
  explicitly log out, after which the system treats them as signed out.
- **FR-006**: The system MUST treat any backend rejection due to an
  expired or missing session as a sign-out, redirecting to the login page,
  rather than displaying it as an ordinary error.

**Ticket creation & assignment display**

- **FR-007**: The system MUST NOT offer an assignee field on the
  create-ticket form; the ticket's assignee is determined automatically by
  the backend.
- **FR-008**: The system MUST display a ticket's currently assigned
  `SUPPORT` user's name on its detail page, or a clear "Unassigned" state
  when none is set.
- **FR-009**: The system MUST NOT offer an assignee field on the
  ticket-edit page (title/description/priority only).
- **FR-010**: The system MUST provide a reassignment control on a ticket's
  detail page, visible only to a signed-in user with the `ADMIN` role,
  offering the current `SUPPORT` users as reassignment choices.
- **FR-011**: The system MUST update the displayed assignee immediately
  after a successful reassignment.
- **FR-011a**: The system MUST display an inline error near the
  reassignment control, and MUST keep it open with the attempted selection
  still showing, when a reassignment attempt fails — without discarding the
  `ADMIN`'s attempted choice or reverting to the prior assignee.
- **FR-012**: The system MUST NOT display or offer the reassignment control
  to a signed-in user without the `ADMIN` role.

**Chatbot**

- **FR-013**: The system MUST provide a chatbot widget accepting a
  free-text query, reachable only to a signed-in user, and MUST make that
  widget available from every page in the application (not a separate,
  standalone page).
- **FR-013a**: The system MUST keep the chatbot widget and its current
  conversation available and unchanged as the signed-in user navigates
  between pages.
- **FR-013b**: The system MUST show the chatbot widget collapsed (a small
  button/icon) by default on every page load, requiring the user to open it
  before submitting a query.
- **FR-014**: The system MUST prevent submission of an empty or blank
  chatbot query and display a clear validation message without contacting
  the backend.
- **FR-015**: The system MUST display each chatbot response together with
  a plain, non-clickable reference to the past ticket(s) it was grounded in
  (e.g. "Ticket #4821") — never a link to that ticket's detail page.
- **FR-016**: The system MUST display all turns of the current chatbot
  conversation (queries and responses) in order, and MUST reflect a new
  query's response in the context of that visible history.
- **FR-017**: The system MUST display a clear "no confident match" message,
  distinct from a normal answer, when the backend indicates no sufficiently
  similar past ticket was found, and MUST direct the user to the
  ticket-creation page from that message.
- **FR-018**: The system MUST display a clear, distinct service-unavailable
  message when the chatbot backend cannot be reached or times out.
- **FR-019**: The system MUST start a new visible conversation when the
  prior one has ended (explicitly or via inactivity), rather than
  continuing to display it as active.
- **FR-020**: The system MUST render chatbot responses exactly as returned
  by the backend, without adding, inferring, or displaying any additional
  internal ticket/comment detail beyond what the response contains.

**Comments & authorship**

- **FR-021**: The system MUST display the name of the user who created each
  comment, alongside its content and timestamp.
- **FR-022**: The system MUST show the comment-submission form only to a
  signed-in user who is that ticket's creator or its currently assigned
  `SUPPORT` user.
- **FR-023**: The system MUST display a clear authorization message, and
  MUST NOT add the comment, when the backend rejects a comment attempt from
  a user who is neither the ticket's creator nor its assignee.

**Ticket listing & view authorization**

- **FR-023a**: The system MUST display each ticket's creator name as a
  visible column in the ticket list, alongside its existing title, status,
  priority, and assignee columns.
- **FR-024**: The system MUST allow the ticket list to be scoped to exactly
  one of: tickets created by the signed-in user, tickets assigned to them,
  or all tickets they are permitted to see.
- **FR-024a**: The system MUST NOT offer the "assigned to me" ownership
  scope to a signed-in user with the `GENERAL` role, since that role is
  never a ticket assignee.
- **FR-025**: The system MUST allow an ownership scope to be combined with
  the existing keyword and status filters, showing only tickets matching
  all of them together.
- **FR-026**: The system MUST display a clear "not permitted to view this
  ticket" state, instead of ticket details, when the backend rejects a
  single-ticket or comment retrieval as unauthorized.

### Key Entities

- **User Session**: The signed-in state of one user in the browser.
  Attributes: signed-in user's name and role (`SUPPORT`, `GENERAL`,
  `ADMIN`), used to decide which UI controls (reassignment, comment form)
  are shown.
- **Ticket** *(extends the existing Ticket entity)*: Assignee is now a
  system-chosen `SUPPORT` user (or none) rather than a value the UI lets a
  caller set at creation; a ticket also has a creator, used for ownership
  scoping and view authorization.
- **Comment** *(extends the existing Comment entity)*: Now carries the name
  of the user who created it, displayed with its content.
- **Chatbot Conversation**: The signed-in user's ongoing exchange with the
  chatbot, displayed as an ordered list of turns; ends explicitly or after
  30 minutes of inactivity, after which the next query starts a new one.
- **Chatbot Turn**: One query and its response within a conversation.
  Attributes: query text, response text, cited source ticket reference(s)
  or a no-match indicator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to reach a protected page without an active
  session are redirected to login, verified across every page this
  frontend exposes.
- **SC-002**: A signed-in user can locate their currently assigned tickets
  using the ownership-scope filter in under 15 seconds, from a list of at
  least 50 tickets.
- **SC-003**: 100% of comment attempts by a user who is neither a ticket's
  creator nor its assignee are visibly rejected, and none of those attempts
  result in a comment appearing in the history.
- **SC-004**: A user can submit a chatbot query and see a response,
  including its cited source ticket(s) or a clear no-match message, in
  under 5 seconds under normal conditions.
- **SC-005**: 100% of chatbot "no confident match" responses include a
  visible path to manual ticket creation.
- **SC-006**: 100% of unauthorized single-ticket view attempts result in a
  clear "not permitted" state rather than partial or full ticket details
  being shown.
- **SC-007**: No password value is ever visible in the rendered UI, browser
  storage inspection, or client-side logs at any point after submission.

## Assumptions

- This specification covers only the frontend's consumption of the
  capabilities defined in backend spec `005-auth-rag-chatbot`; the login
  mechanism, auto-assignment algorithm, semantic retrieval, knowledge-base
  maintenance, and response-generation/rewording logic are backend
  responsibilities consumed, not re-implemented, by this UI.
- Session handling (how the signed-in state is stored and attached to
  requests, and its expiry duration) is an implementation detail left to
  design; this spec only requires that its loss be treated as sign-out
  (FR-006).
- User account creation and role assignment are out of scope for this
  frontend, consistent with backend spec 005's assumption that accounts
  exist as seed data; there is no account-creation UI in this feature.
- The chatbot's cited "ticket reference" (FR-015) is a human-readable
  identifier (e.g. a ticket number/title) rather than an internal record
  dump, consistent with backend FR-025; it is always plain text, never a
  link, regardless of the viewer's role or permission to open that ticket.
- The chatbot widget's placement (e.g. corner-anchored, collapsible) and
  exact persistence mechanism across navigation are implementation details
  left to design; this spec only requires that it remain available and its
  conversation unchanged across page navigation (FR-013a).
- This revision fully replaces this spec's original scope (an
  agent-facing, informational "similar ticket suggestions" panel on the
  create/detail pages); no part of that original design is carried forward,
  since the backend was never built to support it.
- Password strength rules, login lockout, and chatbot rate-limiting are out
  of scope for this frontend, consistent with backend spec 005 deferring
  all three to the infrastructure/gateway layer or a future feature.
