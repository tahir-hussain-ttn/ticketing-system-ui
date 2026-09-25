# Bug Fix: Login succeeds (200 OK) but UI does not redirect, login screen resets

- **Slug**: login-no-redirect
- **Fixed**: 2026-09-25
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`backend-api-doc.json` confirms `POST /api/v1/auth/login` returns a flat `LoginResponse` (`{id, name, email, role}`) with no token field, and the backend authenticates via an httpOnly session cookie. The frontend had been assuming a `{ user: {...}, token: string }` envelope and sending a `Bearer` token header it never actually had — so `session.user`/`session.token` were always `undefined`, `AuthContext`'s `user` state stayed falsy, and `ProtectedRoute` bounced straight back to `/login` right after the SPA navigated to `/`, which read as the login screen "refreshing." Fixed by aligning the frontend's auth types/plumbing with the real contract: treat the login response as the `User` object directly, drop the bearer-token header, and send credentials (cookies) with every request instead.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/types/user.ts` | modified | Removed `AuthSession` envelope; `User` now includes `email` (per `LoginResponse` schema) and is itself the session shape. |
| `src/api/authApi.ts` | modified | `login()` now returns `Promise<User>` instead of `Promise<AuthSession>`. |
| `src/auth/session.ts` | modified | `getSession`/`setSession` now store `User` directly; removed `getToken()` (no token exists). |
| `src/api/http.ts` | modified | Removed the `Authorization: Bearer` header (no token in the contract); added `credentials: "include"` so the session cookie is sent cross-origin (UI origin ≠ `http://localhost:8080` backend). |
| `src/context/AuthContext.tsx` | modified | `login()` treats the API response as the user itself; guards against a malformed/empty response by throwing instead of silently setting a falsy user. |
| `src/pages/LoginPage.tsx` | modified | Catch block now surfaces a plain `Error`'s message (e.g. the new malformed-response guard) instead of always falling back to the generic network-error text. |
| `tests/msw/handlers.ts` | modified | Mock login handler now returns the flat `User` shape and tracks the "signed in" user via in-memory server state instead of a `Bearer` token header, matching the real cookie-session contract (Node/undici fetch in the jsdom test environment doesn't maintain a cookie jar across requests). `MOCK_USERS` gained `email`. |

## Diff Highlights

```ts
// src/context/AuthContext.tsx
async function login(email: string, password: string): Promise<void> {
  const loggedInUser = await authApi.login({ email, password });
  if (!loggedInUser?.id) {
    throw new Error("Login response was missing the expected user fields.");
  }
  setSession(loggedInUser);
  setUser(loggedInUser);
}
```

```ts
// src/api/http.ts
const response = await fetch(buildUrl(path, options.query), {
  method: options.method ?? "GET",
  headers,
  credentials: "include",
  body: options.body ? JSON.stringify(options.body) : undefined,
});
```

## Tests Added or Updated

- `tests/msw/handlers.ts` — login/logout handlers and `userFromRequest` reworked to match the confirmed backend contract (flat user response, cookie-style session tracking) so existing integration tests exercise the real shape instead of the old, incorrect one.
- No new test cases were added: the existing `tests/integration/login.test.tsx` suite (6 tests covering success, wrong password, unregistered email, blank-field validation, logout, and 401-mid-session sign-out) already covers the FR-001–FR-006 login/logout behavior end-to-end and now runs against the corrected contract.

## Local Verification

- Commands run: `npx tsc --noEmit` → clean, no errors.
- Commands run: `npx vitest run` → 13 test files, 47 tests, all passed.
- Manual checks: none (no dev server / real backend available in this environment); recommend a manual smoke test against the actual backend to confirm the session cookie round-trips correctly under CORS (see Risks below).

## Deviations from Assessment

- The assessment's preferred remediation said to "confirm and, if needed, align `AuthSession`/`http.ts` deserialization with whatever shape the backend actually returns." With `backend-api-doc.json` now available, the confirmed shape is a **flat, tokenless** `LoginResponse`, which is a bigger contract change than a field rename: it means the app uses cookie-based sessions, not bearer tokens. This required also editing `src/api/http.ts` (drop `Authorization` header, add `credentials: "include"`) and `tests/msw/handlers.ts` (drop the mock's `Authorization: Bearer` scheme entirely) — both outside the assessment's originally-listed file list, but a direct consequence of the confirmed contract and necessary for the fix to be correct and for tests to reflect reality.
- `AuthSession` type was removed rather than kept as a thin wrapper, since the backend has no separate token to wrap — `User` now doubles as the session record. This is a smaller, simpler shape than the assessment's alternative of adding validation on top of the existing wrapper.

## Follow-ups

- Manually verify against a running backend that the browser actually receives and forwards the session cookie cross-origin (needs backend CORS configured with `Access-Control-Allow-Credentials: true` and an explicit `Access-Control-Allow-Origin` — not `*` — for the UI's dev origin). This is a backend-side config concern outside this repo.
- `backend-api-doc.json` shows other frontend/backend path mismatches unrelated to this bug (e.g. mock chatbot endpoints `/api/v1/chatbot/conversations/:conversationId/queries` vs. documented `/api/v1/chatbot/messages`; mock reassignment endpoint `POST .../reassign` vs. documented `PATCH .../assignee`). Out of scope here — worth a follow-up bug/assessment pass since they'd cause the same class of silent-shape-mismatch failures.
- Consider adding a lightweight runtime schema check (e.g. zod) at the `request<TResponse>()` boundary in `http.ts` so any future backend/frontend contract drift fails loudly instead of silently, per the assessment's noted alternative.
