import type { AuthSession } from "../types/user";

const STORAGE_KEY = "ticketing.session";

let currentSession: AuthSession | null = null;
let hydrated = false;
const expiryListeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated) {
    return;
  }
  hydrated = true;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      currentSession = JSON.parse(stored) as AuthSession;
    } catch {
      currentSession = null;
    }
  }
}

export function getSession(): AuthSession | null {
  hydrate();
  return currentSession;
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function setSession(session: AuthSession): void {
  currentSession = session;
  hydrated = true;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  currentSession = null;
  hydrated = true;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Subscribes to session-expiry (FR-006); returns an unsubscribe function. */
export function onSessionExpired(listener: () => void): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

/** Called by the HTTP layer on a 401 — clears the session and notifies subscribers. */
export function notifySessionExpired(): void {
  clearSession();
  for (const listener of expiryListeners) {
    listener();
  }
}
