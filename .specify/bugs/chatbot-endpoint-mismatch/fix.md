# Bug Fix: Chatbot "send query" API returns 404 — wrong endpoint

- **Slug**: chatbot-endpoint-mismatch
- **Fixed**: 2026-09-25
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`chatbotApi.submitQuery` was calling nonexistent endpoints (`/api/v1/chatbot/conversations/{id}/queries` / `.../conversations/queries`) — the real backend only exposes a single `POST /api/v1/chatbot/messages` with `conversationId` as an optional body field, per `backend-api-doc.json`. Reworked the chatbot API client, types, and context to match the documented contract, and wired up the previously-missing `POST /api/v1/chatbot/conversations/{id}/end` call so "End chat" actually closes the conversation server-side.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/types/chatbot.ts` | modified | Replaced `ChatbotQueryResponse` (`{conversationId, turnId, status, response, sourceTickets}`) with `ChatbotTurnResponse` (`{conversationId, responseText, sourceTicketIds, confidentMatch}`), matching the backend schema. `turnId`/`status` didn't exist on the wire and were dropped; `ChatbotTurn`/`ChatbotConversation` (the frontend's own display model) are unchanged. |
| `src/api/chatbotApi.ts` | modified | `submitQuery` now calls `POST /api/v1/chatbot/messages` with `{query, conversationId}` in the body (no more path-based conversationId). Added `endConversation(conversationId)` → `POST /api/v1/chatbot/conversations/{id}/end`. |
| `src/context/ChatbotContext.tsx` | modified | Maps the real response at the API boundary: `confidentMatch ? "answered" : "no-match"`, `responseText` → `response` (only when confident), `sourceTicketIds` → `sourceTickets` (formatted as `Ticket #<id>` for display, since the backend returns raw ids, not display strings). `endConversation()` now calls `chatbotApi.endConversation(conversation.id)` when a conversation is open and not already ended, before clearing local state. |
| `tests/msw/handlers.ts` | modified | Chatbot mock reworked to a single `POST /api/v1/chatbot/messages` handler (reading `conversationId` from the body) matching the real contract, returning `{conversationId, responseText, sourceTicketIds, confidentMatch}`; added a `POST /api/v1/chatbot/conversations/:conversationId/end` handler returning `204`. |
| `tests/integration/chatbot-widget.test.tsx` | modified | Added a new test asserting "End chat" issues a real `.../end` request with the conversation's id. Existing tests needed no other changes — they assert on rendered text, not response field names. |

## Diff Highlights

```ts
// src/api/chatbotApi.ts
export const chatbotApi = {
  submitQuery(query: string, conversationId?: string): Promise<ChatbotTurnResponse> {
    return request<ChatbotTurnResponse>("/api/v1/chatbot/messages", {
      method: "POST",
      body: { query, conversationId },
    });
  },
  endConversation(conversationId: string): Promise<void> {
    return request<void>(`/api/v1/chatbot/conversations/${conversationId}/end`, {
      method: "POST",
    });
  },
};
```

```ts
// src/context/ChatbotContext.tsx
function endConversation(): void {
  setConversation((prev) => {
    if (prev.id !== null && prev.endedAt === null) {
      void chatbotApi.endConversation(prev.id);
    }
    return { ...prev, endedAt: new Date().toISOString() };
  });
}
```

## Tests Added or Updated

- `tests/integration/chatbot-widget.test.tsx` — added `"calls the backend to end the conversation when 'End chat' is clicked"`: overrides the `.../end` mock to capture the `conversationId` path param and asserts it's called.
- All 6 pre-existing chatbot tests (collapsed-by-default, answered query, follow-up, cross-navigation persistence, empty-query validation, no-match, service-unavailable) pass unchanged against the corrected mock contract.

## Local Verification

- Commands run: `npx tsc --noEmit` → clean, no errors.
- Commands run: `npx vitest run` → 13 test files, 48 tests, all passed (up from 47 — the new end-conversation test).
- Manual checks: none (no real backend/dev server available in this environment).

## Deviations from Assessment

- The assessment left the `confidentMatch → status` mapping and the `404`-on-stale-conversationId behavior as open questions. Proceeded with the assessment's own stated defaults (`confidentMatch: true → "answered"`, `false → "no-match"`; a `404`/any other error falls through to the existing generic `catch` → `"error"` turn state) since the verdict was `valid` (not gated on clarification) and no answer was given before this fix ran. Flagging here for visibility — if the backend's `confidentMatch` semantics turn out to be more nuanced, or a stale-conversation 404 should behave differently (e.g. silently retry as a new conversation), that's a follow-up change to `ChatbotContext.tsx`'s `catch` block, not a revert of this fix.
- `sourceTicketIds` → display-string formatting (`Ticket #<id>`) was added in `ChatbotContext.tsx` rather than the mock pre-formatting the string, since the real backend schema documents raw UUIDs, not display-ready text — this keeps the translation at the API boundary as the assessment recommended, rather than baking a UI-format assumption into the mock server.

## Follow-ups

- This was the third contract-mismatch bug fixed in this session ([[login-no-redirect]], [[post-login-api-mismatch]], this one). Strongly recommend the previously-suggested runtime schema-validation layer (e.g. zod) at the `request<TResponse>()` boundary in `src/api/http.ts` — it would have caught all three at the point of the actual backend call, rather than requiring a user to hit each one manually.
- The `ticketsApi.reassign` (wrong method/path: `POST .../reassign` vs. documented `PATCH .../assignee`) and `usersApi.listByRole` (`/api/v1/users`, undocumented) mismatches flagged in the `post-login-api-mismatch` audit are still open and unaddressed.
