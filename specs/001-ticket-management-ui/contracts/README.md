# Contracts: Support Ticket Management UI

This feature does not expose an API of its own — it is a frontend that
**consumes** an existing backend. Its interface contract is therefore the
subset of the backend's OpenAPI document it depends on.

**Source of truth**: `backend-api-doc.json` (repository root, OpenAPI
3.1). Do not duplicate its schemas here; `src/types/` is the frontend's
typed mirror of the schemas listed below, and `src/api/` is the only code
allowed to call these endpoints (Constitution Principle V).

## Endpoints consumed

| Method | Path | Used by | Request schema | Response schema(s) |
|---|---|---|---|---|
| `GET` | `/api/v1/tickets` | US1 (list), US4 (search/filter) | query: `q?`, `status?`, `page?`, `size?` | `200 TicketPage` |
| `POST` | `/api/v1/tickets` | US1 (create) | `TicketCreateRequest` | `201 TicketResponse` \| `400 ApiError` |
| `GET` | `/api/v1/tickets/{ticketId}` | US2 (view detail) | path: `ticketId` | `200 TicketDetailResponse` \| `404 ApiError` |
| `PATCH` | `/api/v1/tickets/{ticketId}` | US2 (update fields) | path: `ticketId`, body: `TicketUpdateRequest` | `200 TicketResponse` \| `400/404/409 ApiError` |
| `POST` | `/api/v1/tickets/{ticketId}/transitions` | US2 (status change) | path: `ticketId`, body: `TicketTransitionRequest` | `200 TicketResponse` \| `404/409 ApiError` |
| `GET` | `/api/v1/tickets/{ticketId}/comments` | US3 (view comment history, paginated per FR-006a) | path: `ticketId`, query: `page?`, `size?` | `200 CommentPage` \| `404 ApiError` |
| `POST` | `/api/v1/tickets/{ticketId}/comments` | US3 (add comment) | path: `ticketId`, body: `CommentCreateRequest` | `201 CommentResponse` \| `400/404 ApiError` |

## Frontend-side contract notes

- `PATCH .../{ticketId}` MUST NOT ever send a `status` field — it is not
  part of `TicketUpdateRequest` and status changes only happen through the
  transitions endpoint (per `backend-api-doc.json`'s own description of
  `update`).
- Every `409` from the transitions or update endpoints is a rejection the
  UI must display, not retry automatically or hide.
- `GET /api/v1/tickets` combines `q` (keyword, matched by the backend
  against title/description per the Clarifications decision) and `status`
  as independent, combinable query params — the UI always sends whichever
  of the two are currently active together.
- `GET /api/v1/tickets/{ticketId}/comments` is the sole source for the
  comment list the UI renders; the `comments` array embedded in
  `TicketDetailResponse` is not read by the UI (see data-model.md
  Relationships) since it duplicates this endpoint without pagination.
- `CommentResponse` has no author field — comments are shown by content
  and timestamp only.

## Mock contract for tests

`tests/msw/handlers.ts` implements MSW handlers for all seven rows above,
mirroring each schema's required fields and the documented error status
codes (`400`, `404`, `409`), so integration tests can exercise both
accept and reject paths without a live backend.
