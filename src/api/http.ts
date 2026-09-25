import { API_BASE_URL } from "../config/env";
import type { ApiError } from "../types/apiError";
import { getToken, notifySessionExpired } from "../auth/session";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError,
  ) {
    super(apiError.message);
  }
}

/**
 * For use as a TanStack Query `retry` option: client errors (4xx, e.g. 401/
 * 403/404) are never transient, so retrying only delays surfacing them
 * (Constitution IV — meaningful, prompt error feedback).
 */
export function shouldRetryOnError(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpError && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const headers: Record<string, string> = options.body
    ? { "Content-Type": "application/json" }
    : {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const apiError = (await response.json()) as ApiError;
    if (response.status === 401) {
      notifySessionExpired();
    }
    throw new HttpError(response.status, apiError);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
