# Bug Assessment: "Change Status" dropdown doesn't offer RESOLVED

- **Slug**: missing-resolved-status
- **Created**: 2026-09-25
- **Source**: pasted text
- **Verdict**: invalid
- **Severity**: low (documentation/UX clarity gap only — no incorrect behavior found)

## Report (verbatim)

> There is another issue which I can see in the ticket details page. The change status drop down does not have RESOLVED status. Why does it not have that?

## Symptom

On the ticket detail page, the "Change Status" dropdown (`StatusTransitionMenu`) doesn't list `RESOLVED` as an option. User expected `RESOLVED` to always be selectable.

## Reproduction

1. Open a ticket's detail page.
2. Click "Change Status."
3. Observe the menu's options.

[NEEDS CLARIFICATION: what was the ticket's *current* status when this was observed? This determines whether the behavior is correct or not — see Root Cause Hypothesis.]

## Suspected Code Paths

- `src/components/StatusTransitionMenu/StatusTransitionMenu.tsx:16-22` — `NEXT_STATUSES` is a state-machine table keyed by *current* status, not a flat list of all possible statuses:
  ```ts
  const NEXT_STATUSES: Record<Status, Status[]> = {
    OPEN: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  ```
  `RESOLVED` is only offered when `currentStatus === "IN_PROGRESS"`. From `OPEN`, the menu only offers `IN_PROGRESS`/`CANCELLED` — by design, a ticket can't jump straight from `OPEN` to `RESOLVED`.
  - `StatusTransitionMenu.tsx:37-39` — if `nextStatuses.length === 0` (i.e. current status is `CLOSED` or `CANCELLED`), the component renders `null` — no button/dropdown appears at all. If the ticket the user was looking at is in one of these terminal states, there's no "Change Status" control to click in the first place, which could also read as "the dropdown doesn't have RESOLVED" if misread as "no dropdown at all."
- `tests/msw/handlers.ts:125-131` — the mock backend's `ALLOWED_TRANSITIONS` table is **identical** to the frontend's `NEXT_STATUSES`, confirming this state machine is an intentional, already-agreed contract between frontend and (mocked) backend, not an accidental frontend-only omission:
  ```ts
  const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
    OPEN: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  ```
- `backend-api-doc.json` — the `/api/v1/tickets/{ticketId}/transitions` endpoint (lines 162-224) documents that it "Applies a status transition per the allowed state machine (FR-009, FR-010)" and returns `409` when "Transition not allowed from the current status" — confirming the real backend also enforces a from-status-dependent transition table, consistent with the frontend's restriction. The doc doesn't enumerate the exact table (that lives in FR-009/FR-010, not the OpenAPI schema), so the *exact* transitions can't be independently re-verified from this doc alone, but the shape of the constraint matches.
- `src/pages/TicketDetailPage.tsx:101-104` — renders `<StatusTransitionMenu ticketId={ticket.id} currentStatus={ticket.status} />`, correctly passing the ticket's actual current status.

## Root Cause Hypothesis

Confidence: high. This is not a bug — it's the intended ticket lifecycle state machine (`OPEN → IN_PROGRESS/CANCELLED`, `IN_PROGRESS → RESOLVED/CANCELLED`, `RESOLVED → CLOSED`), matching FR-009/FR-010 and mirrored identically in the test mock's backend simulation. `RESOLVED` is reachable only as the *next* status from `IN_PROGRESS`, not from `OPEN` directly, and not at all once a ticket is `CLOSED`/`CANCELLED` (terminal states, no menu shown). The reported "missing RESOLVED" is very likely the user viewing a ticket that's currently `OPEN` (where the correct next step is `IN_PROGRESS` first) or in a terminal state (where no status-change control appears at all).

## Proposed Remediation

**Preferred**: No code change — this is working as designed per the FR-009/FR-010 state machine. Two low-cost UX improvements would reduce this kind of confusion without changing behavior:
1. When the menu has no options (`CLOSED`/`CANCELLED`), show a disabled "Change Status" button or a small note (e.g. "This ticket is closed") instead of rendering nothing, so it's clear the control is intentionally absent rather than broken.
2. Consider a tooltip or helper text near the button clarifying the lifecycle (e.g. "Move to In Progress first to resolve this ticket") when the current status is `OPEN`.

**Alternatives**:
- Do nothing — this may be sufficiently self-explanatory once the user knows the lifecycle rule, and adding UI affordances has its own cost/review overhead for a "not a bug" finding.

**Files likely to change** (only if the UX improvement is wanted — confirm with user first):
- `src/components/StatusTransitionMenu/StatusTransitionMenu.tsx`

**Tests to add or update**:
- None required for a "no bug" verdict. If the UX improvement above is pursued, add a test asserting a disabled/explanatory state renders for `CLOSED`/`CANCELLED` tickets instead of nothing.

## Risks & Considerations

- None — no code change proposed. Risk is purely in mis-diagnosing this as a bug and "fixing" the state machine to allow `OPEN → RESOLVED` directly, which would violate FR-009/FR-010 and diverge from the backend's enforced transition rules (yielding a 409 the UI would then need to explain anyway).

## Open Questions

- [NEEDS CLARIFICATION: what was the ticket's current status (`OPEN`, `IN_PROGRESS`, `CLOSED`, `CANCELLED`) when RESOLVED was expected but missing? This confirms which of the two scenarios above applies.]
- [NEEDS CLARIFICATION: does the user want the UX-improvement follow-up (disabled button / helper text for terminal and pre-IN_PROGRESS states), or is understanding the lifecycle rule sufficient?]
