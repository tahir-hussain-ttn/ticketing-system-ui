# Bug Assessment: Login succeeds (200 OK) but UI does not redirect, login screen resets

- **Slug**: login-no-redirect
- **Created**: 2026-09-25
- **Source**: pasted text
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim)

> I think there is some bug in the UI. When I do login, I get correct response from backend API (200 Ok), still I am not getting redirected to the next page and the login screen gets refreshed.

## Symptom

User submits login form. Backend responds 200 OK. Expected: app navigates to `/` (ticket list). Observed: user stays on/returns to login screen, which appears to "refresh" (reset). No full browser reload is involved — this is a client-side (SPA) bounce, not `window.location` reload.

## Reproduction

1. Open `/login`.
2. Submit valid credentials; backend returns 200 with a session payload.
3. Observe: briefly navigates away, then lands back on `/login` with cleared form state.

[NEEDS CLARIFICATION: exact JSON body shape returned by backend `/api/v1/auth/login` 200 response — confirm via network tab or backend controller/DTO.]

## Suspected Code Paths

- `src/pages/LoginPage.tsx:41-42` — on success, calls `await login.mutateAsync(...)` then `navigate("/")`. Form's `onSubmit` correctly calls `event.preventDefault()` (line 25) — native full-page reload ruled out.
- `src/hooks/useLogin.ts:7-10` — `useMutation` wrapping `AuthContext.login`.
- `src/context/AuthContext.tsx:27-31` — `login()` calls `authApi.login`, then `setSession(session)` and `setUser(session.user)`. No check that `session.user` / `session.token` are actually present.
- `src/api/authApi.ts:5-11` — `login()` returns `request<AuthSession>(...)`.
- `src/api/http.ts:65-77` — `request()` checks `response.ok` (any 2xx passes) then does `return (await response.json()) as TResponse` at line 77: a blind type assertion, no runtime validation against the `AuthSession` shape.
- `src/types/user.ts:9-12` — expected shape is exactly `{ user: User, token: string }`.
- `src/routes/ProtectedRoute.tsx:5-13` — guard for `/`: `if (!user) return <Navigate to="/login" replace />`. Condition is the in-memory `user` from `AuthContext`, not a token/localStorage check.
- `src/routes/router.tsx:9-19` and `src/App.tsx:82-86` — `AuthProvider` correctly wraps `RouterProvider`, so context propagation itself is not broken.

## Root Cause Hypothesis

Confidence: medium.

`http.ts:77` blindly casts the response JSON to `AuthSession` with zero shape validation. If backend's actual 200 response body doesn't match the flat `{ user: {...}, token: "..." }` shape exactly (e.g. wrapped as `{ data: {...} }`, or using `accessToken`/`userInfo` field names), `session.user` and `session.token` come back `undefined`. `AuthContext.login` still calls `setSession(session)` and `setUser(session.user)` unconditionally (no truthiness check), so `user` state stays falsy. `LoginPage` then calls `navigate("/")` (this succeeds as a client-side navigation — no error was thrown, since nothing validates the payload). `ProtectedRoute` renders for `/`, sees falsy `user`, and immediately fires `<Navigate to="/login" replace />`. To the user this reads as "briefly navigated, then landed back on /login" — i.e. the reported "screen refresh," even though no real page reload occurred.

This fits every symptom: backend 200 OK (true — no HttpError thrown, since `response.ok` passed), no redirect retained (true — bounced straight back by the guard), and "refresh" appearance (true — two rapid SPA navigations with no error message shown, since no exception was raised).

## Proposed Remediation

**Preferred**: Add runtime validation of the login response shape in `AuthContext.login` (or in `authApi.login`) before calling `setSession`/`setUser`: check `session?.token` and `session?.user?.id` are present; if not, throw an `HttpError`-like error (or a dedicated `AuthShapeError`) so `LoginPage.handleSubmit`'s existing `catch` block surfaces a real error message instead of silently proceeding to a doomed `navigate("/")`. Then confirm and, if needed, align `AuthSession`/`http.ts` deserialization with whatever shape the backend's `/api/v1/auth/login` endpoint actually returns (e.g. unwrap a `data` envelope, or rename fields).

**Alternatives**:
- Add a lightweight runtime schema check (e.g. zod) at the `request<TResponse>()` boundary in `http.ts` for critical endpoints, catching shape drift generally instead of just for login. Higher effort, broader payoff.
- Have `ProtectedRoute` distinguish "no session at all" from "session present but malformed" and show a distinct error instead of silently redirecting to `/login` — improves debuggability but doesn't fix the root cause.

**Files likely to change**:
- `src/context/AuthContext.tsx`
- `src/api/authApi.ts` and/or `src/api/http.ts`
- Possibly `src/types/user.ts` if the field names need to change to match backend

**Tests to add or update**:
- Unit test: `AuthContext.login` rejects/throws when backend response is missing `user` or `token`, and does not call `setSession`/`setUser` in that case.
- Unit/integration test: `LoginPage` shows a `generalError` alert and stays on `/login` when login response shape is malformed, rather than silently navigating and bouncing back.
- Regression test: `LoginPage` + `ProtectedRoute` navigate to `/` and stay there when login response has the correct shape.

## Risks & Considerations

- Fix requires knowing the actual backend contract — changing `AuthSession`/`http.ts` without confirming the real shape could just move the mismatch elsewhere.
- If backend contract is confirmed correct and matches `{ user, token }`, this hypothesis is wrong and the bug lies elsewhere (e.g. a race condition, or `AuthenticatedChatbot`/`AppHeader` throwing during render of `/` and getting caught by an error boundary that resets to `/login` — not found in code reviewed so far).
- Adding shape validation is generally safe (defensive check only) but must map to a clear user-facing error message per Constitution IV (meaningful, prompt error feedback), referenced already in `http.ts:14-17`.

## Open Questions

- [NEEDS CLARIFICATION: actual JSON body returned by backend's `/api/v1/auth/login` 200 response — does it match `{ user: { id, name, role }, token }` exactly?]
- [NEEDS CLARIFICATION: does browser dev tools Network tab show the SPA doing two navigations (`/` then `/login`) on failure, confirming the `ProtectedRoute` bounce theory, vs. a single navigation that never leaves `/login`?]
- [NEEDS CLARIFICATION: any error visible in browser console during repro (e.g. a thrown exception from consuming `undefined` fields elsewhere) that would point away from the silent-shape-mismatch theory?]
