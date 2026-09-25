# Bug Assessment: Chatbot "send query" API returns 404 — wrong endpoint

- **Slug**: chatbot-endpoint-mismatch
- **Created**: 2026-09-25
- **Source**: pasted text + pasted file `backend-api-doc.json` (also present on disk at repo root)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim)

> There is some mismatch in the chatbot query send API. Current API is getting 404. In the api documentation I see a different url.

## Symptom

Submitting a question in the chatbot widget (`ChatbotConversationView`) always fails with a `404`. Expected: the query is sent to the real backend endpoint and a resolution response comes back. This was already flagged as a follow-up in the [[post-login-api-mismatch]] fix's audit table, and is now confirmed by the user hitting it live.

## Reproduction

1. Open the chatbot widget (FAB button, bottom-right) on any page.
2. Type a question and click "Send."
3. `chatbotApi.submitQuery` calls `POST /api/v1/chatbot/conversations/queries` (first message) or `POST /api/v1/chatbot/conversations/{conversationId}/queries` (follow-up) — neither path exists on the real backend, which returns `404`.

## Suspected Code Paths

- `src/api/chatbotApi.ts:5-16` — builds the request path as `/api/v1/chatbot/conversations/{conversationId}/queries` or `/api/v1/chatbot/conversations/queries`. `backend-api-doc.json` (lines 349-420) defines a single endpoint, **`POST /api/v1/chatbot/messages`**, with `conversationId` passed as an optional field in the JSON **body** (`ChatbotQueryRequest`, lines 929-944), not in the URL path at all. Neither of the frontend's two paths matches — this is the direct cause of the 404.
- `src/types/chatbot.ts:12-18` — `ChatbotQueryResponse` is shaped `{conversationId, turnId, status: "answered"|"no-match", response, sourceTickets}`. The real response schema, `ChatbotTurnResponse` (`backend-api-doc.json` lines 945-966), is `{conversationId, responseText, sourceTicketIds, confidentMatch: boolean}` — different field names (`response`→`responseText`, `sourceTickets`→`sourceTicketIds`), no `turnId` at all, and no `status` enum (there's a boolean `confidentMatch` instead, which the frontend would need to map to its own `"answered"`/`"no-match"` distinction).
- `src/context/ChatbotContext.tsx:81-94` — consumes `result.status`, `result.response`, `result.sourceTickets` from the (currently wrong) response shape; would need to derive these from `responseText`/`sourceTicketIds`/`confidentMatch` once the endpoint and response type are corrected.
- `src/context/ChatbotContext.tsx:42-44` — `endConversation()` is **purely client-side** (`setConversation` only) — it never calls the backend at all. `backend-api-doc.json` documents a real `POST /api/v1/chatbot/conversations/{conversationId}/end` (lines 421-466, FR-036) that this should be hitting so the backend's conversation state is closed too. Today this is a silent gap rather than a crash (nothing calls it, so nothing 404s), but it means "End chat" doesn't actually end anything server-side.
- `tests/msw/handlers.ts:489-538` (`resolveChatbotQuery` and its two `http.post` registrations) — the mock server was written to match the same incorrect endpoint shapes as the frontend, so the existing `tests/integration/chatbot-widget.test.tsx` suite passes today despite the real contract mismatch — the same blind-spot pattern found in the two prior bugs ([[login-no-redirect]], [[post-login-api-mismatch]]).

## Root Cause Hypothesis

Confidence: high, directly confirmed against `backend-api-doc.json` and the user's reported 404. This is the third instance of the same root pattern across this session's three prior bugs: the frontend's chatbot API client, types, and test mocks were all built against an assumed contract that was never reconciled with the documented backend. The chatbot mismatch is the largest of the three — wrong endpoint path/method shape (not just a field rename), a materially different response schema, and a missing "end conversation" backend call.

## Proposed Remediation

**Preferred**: Rework `chatbotApi` and its consumers to match the documented contract:
- `chatbotApi.submitQuery(query, conversationId?)` → `POST /api/v1/chatbot/messages` with body `{query, conversationId}` (conversationId omitted/undefined when starting a new conversation), returning `ChatbotTurnResponse`.
- Add `chatbotApi.endConversation(conversationId)` → `POST /api/v1/chatbot/conversations/{conversationId}/end`.
- Update `src/types/chatbot.ts`: replace `ChatbotQueryResponse` with a type matching `ChatbotTurnResponse` (`{conversationId, responseText, sourceTicketIds, confidentMatch}`), and keep `ChatbotTurn`/`ChatbotConversation` as the frontend's own display model, translating at the API boundary in `ChatbotContext.tsx`: `status: confidentMatch ? "answered" : "no-match"`, `response: responseText`, `sourceTickets: sourceTicketIds`.
- Update `ChatbotContext.tsx`'s `endConversation()` to actually call `chatbotApi.endConversation(conversation.id)` (guarded: only when `conversation.id` is set and not already ended), consistent with FR-036, before/while clearing local state.
- Handle the documented `404` (stale/ended/not-owned `conversationId`) and `503` (service unavailable) responses distinctly if useful — `503` already degrades acceptably today via the generic `catch` → `"error"` turn status; `404` on a follow-up message could fall back to starting a fresh conversation rather than showing a generic error, but this is a UX nicety, not required for the core fix.

**Alternatives**:
- Keep the current two-path (`.../conversations/{id}/queries` / `.../conversations/queries`) design if the real backend actually supports it under an undocumented alias — but the user's own 404 report combined with the doc's explicit, differently-shaped `/api/v1/chatbot/messages` endpoint makes this unlikely; not recommended without new evidence.

**Files likely to change**:
- `src/api/chatbotApi.ts`
- `src/types/chatbot.ts`
- `src/context/ChatbotContext.tsx`
- `tests/msw/handlers.ts` (chatbot mock handlers — path, body, and response shape)
- `tests/integration/chatbot-widget.test.tsx` (fixture/response shape, if its assertions depend on now-renamed fields)

**Tests to add or update**:
- Update `tests/integration/chatbot-widget.test.tsx` to mock `POST /api/v1/chatbot/messages` and `POST /api/v1/chatbot/conversations/{id}/end`, and to seed responses using the `ChatbotTurnResponse` shape (`responseText`, `sourceTicketIds`, `confidentMatch`).
- Add/keep coverage for: a confident match rendering `responseText`/`sourceTicketIds` as an "answered" turn; a non-confident match (`confidentMatch: false`) rendering the existing "no-match" / "Raise a ticket" UI; clicking "End chat" actually issuing the `.../end` request.

## Risks & Considerations

- This is the third contract-mismatch bug found in this session (after [[login-no-redirect]] and [[post-login-api-mismatch]]) — same root cause pattern (assumed shapes never reconciled with the documented backend, and test mocks encoding the same wrong assumption so nothing catches it). Worth escalating as a process gap, not just three isolated fixes; the previously-suggested runtime schema-validation layer at the `request<TResponse>()` boundary would have caught all three variants of this earlier.
- The `confidentMatch → status` mapping is an inference (the doc's boolean maps naturally to the frontend's binary `"answered"`/`"no-match"` states), not something stated outright in the doc — flagged as a `NEEDS CLARIFICATION` below for confirmation before/while fixing.
- Wiring up the real `.../end` call changes behavior (a network request now fires on "End chat" that didn't before) — low risk, but worth noting since it's new server-visible behavior, not just a rename.

## Open Questions

- [NEEDS CLARIFICATION: is mapping `confidentMatch: true → "answered"` / `confidentMatch: false → "no-match"` correct, or does the backend have additional nuance (e.g. a partial-match state) not captured by a single boolean?]
- [NEEDS CLARIFICATION: should a `404` on a follow-up message (stale/ended conversationId) silently retry as a new conversation, or should it surface as a visible error to the user? Assessment defaults to treating it as the existing generic error/`"error"` turn state unless told otherwise.]
