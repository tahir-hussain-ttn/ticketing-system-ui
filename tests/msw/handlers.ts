import { http, HttpResponse } from "msw";
import type { Comment, CommentPage } from "../../src/types/comment";
import type { Status, Ticket, TicketDetail, TicketPage } from "../../src/types/ticket";
import type { ApiError } from "../../src/types/apiError";
import type { User } from "../../src/types/user";
import { setSession, clearSession } from "../../src/auth/session";

const BASE_URL = "http://localhost:8080";

export const MOCK_USERS: User[] = [
  { id: "u-support-1", name: "Sam Support", role: "SUPPORT" },
  { id: "u-support-2", name: "Sasha Support", role: "SUPPORT" },
  { id: "u-general-1", name: "Gina General", role: "GENERAL" },
  { id: "u-admin-1", name: "Alex Admin", role: "ADMIN" },
];

const CREDENTIALS: Record<string, { password: string; userId: string }> = {
  "sam@example.com": { password: "password123", userId: "u-support-1" },
  "gina@example.com": { password: "password123", userId: "u-general-1" },
  "alex@example.com": { password: "password123", userId: "u-admin-1" },
};

function tokenFor(userId: string): string {
  return `token:${userId}`;
}

/** Test helper: seed a signed-in session directly, bypassing the login UI. */
export function seedSession(user: User): void {
  setSession({ user, token: tokenFor(user.id) });
}

export function resetSession(): void {
  clearSession();
}

function userFromRequest(request: Request): User | undefined {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer token:")) {
    return undefined;
  }
  const userId = auth.slice("Bearer token:".length);
  return MOCK_USERS.find((u) => u.id === userId);
}

export const ticketStore: Ticket[] = [];
export const commentStore: Record<string, Comment[]> = {};
let nextTicketId = 1;
let nextCommentId = 1;

export function resetTicketStore(seed: Ticket[] = []) {
  ticketStore.length = 0;
  ticketStore.push(...seed);
  nextTicketId = seed.length + 1;
  for (const key of Object.keys(commentStore)) {
    delete commentStore[key];
  }
  nextCommentId = 1;
}

function unauthorizedError(path: string): ApiError {
  return {
    code: "UNAUTHENTICATED",
    message: "Authentication required",
    timestamp: new Date().toISOString(),
    path,
  };
}

function forbiddenError(path: string, message: string): ApiError {
  return {
    code: "FORBIDDEN",
    message,
    timestamp: new Date().toISOString(),
    path,
  };
}

function invalidCredentialsError(path: string): ApiError {
  return {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password.",
    timestamp: new Date().toISOString(),
    path,
  };
}

function validationError(path: string, field: string, message: string): ApiError {
  return {
    code: "VALIDATION_FAILED",
    message: "Validation failed",
    timestamp: new Date().toISOString(),
    path,
    fieldErrors: [{ field, message }],
  };
}

function notFoundError(path: string): ApiError {
  return {
    code: "NOT_FOUND",
    message: "Ticket not found",
    timestamp: new Date().toISOString(),
    path,
  };
}

function conflictError(path: string, message: string): ApiError {
  return {
    code: "CONFLICT",
    message,
    timestamp: new Date().toISOString(),
    path,
  };
}

function serviceUnavailableError(path: string): ApiError {
  return {
    code: "SERVICE_UNAVAILABLE",
    message: "The chatbot service is temporarily unavailable.",
    timestamp: new Date().toISOString(),
    path,
  };
}

/** Mirrors the backend's state machine (spec 001, FR-010). */
const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

function findTicket(id: string): Ticket | undefined {
  return ticketStore.find((t) => t.id === id);
}

function canView(user: User, ticket: Ticket): boolean {
  if (user.role === "SUPPORT" || user.role === "ADMIN") {
    return true;
  }
  return ticket.creator.id === user.id || ticket.assignee?.id === user.id;
}

function canComment(user: User, ticket: Ticket): boolean {
  return ticket.creator.id === user.id || ticket.assignee?.id === user.id;
}

let nextConversationId = 1;

export const handlers = [
  // --- Auth ---
  http.post(`${BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const path = "/api/v1/auth/login";
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email) {
      return HttpResponse.json(validationError(path, "email", "Email is required."), {
        status: 400,
      });
    }
    if (!body.password) {
      return HttpResponse.json(
        validationError(path, "password", "Password is required."),
        { status: 400 },
      );
    }

    const credential = CREDENTIALS[body.email];
    if (!credential || credential.password !== body.password) {
      return HttpResponse.json(invalidCredentialsError(path), { status: 401 });
    }

    const user = MOCK_USERS.find((u) => u.id === credential.userId)!;
    return HttpResponse.json({ user, token: tokenFor(user.id) });
  }),

  http.post(`${BASE_URL}/api/v1/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Users ---
  http.get(`${BASE_URL}/api/v1/users`, ({ request }) => {
    const path = "/api/v1/users";
    const user = userFromRequest(request);
    if (!user) {
      return HttpResponse.json(unauthorizedError(path), { status: 401 });
    }
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const result = role ? MOCK_USERS.filter((u) => u.role === role) : MOCK_USERS;
    return HttpResponse.json(result);
  }),

  // --- Tickets ---
  http.get(`${BASE_URL}/api/v1/tickets`, ({ request }) => {
    const path = "/api/v1/tickets";
    const user = userFromRequest(request);
    if (!user) {
      return HttpResponse.json(unauthorizedError(path), { status: 401 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase();
    const status = url.searchParams.get("status");
    const scope = url.searchParams.get("scope");
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "20");

    let filtered = ticketStore;
    if (scope === "created") {
      filtered = filtered.filter((t) => t.creator.id === user.id);
    } else if (scope === "assigned") {
      filtered = filtered.filter((t) => t.assignee?.id === user.id);
    } else if (user.role === "GENERAL") {
      // "all" (or unspecified) default for GENERAL: only tickets they created.
      filtered = filtered.filter((t) => t.creator.id === user.id);
    }

    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }

    const start = page * size;
    const content = filtered.slice(start, start + size);

    const body: TicketPage = {
      content,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    };
    return HttpResponse.json(body);
  }),

  http.post(`${BASE_URL}/api/v1/tickets`, async ({ request }) => {
    const path = "/api/v1/tickets";
    const user = userFromRequest(request);
    if (!user) {
      return HttpResponse.json(unauthorizedError(path), { status: 401 });
    }

    const body = (await request.json()) as Partial<Ticket>;

    if (!body.title || body.title.trim() === "") {
      return HttpResponse.json(
        validationError(path, "title", "Title must not be blank"),
        { status: 400 },
      );
    }
    if (!body.description || body.description.trim() === "") {
      return HttpResponse.json(
        validationError(path, "description", "Description must not be blank"),
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const autoAssignee = MOCK_USERS.find((u) => u.role === "SUPPORT") ?? null;
    const ticket: Ticket = {
      id: String(nextTicketId++),
      title: body.title,
      description: body.description,
      priority: body.priority ?? "LOW",
      status: "OPEN",
      assignee: autoAssignee,
      creator: user,
      createdAt: now,
      updatedAt: now,
    };
    ticketStore.push(ticket);
    commentStore[ticket.id] = [];
    return HttpResponse.json(ticket, { status: 201 });
  }),

  http.get(`${BASE_URL}/api/v1/tickets/:ticketId`, ({ params, request }) => {
    const path = `/api/v1/tickets/${params.ticketId}`;
    const user = userFromRequest(request);
    if (!user) {
      return HttpResponse.json(unauthorizedError(path), { status: 401 });
    }
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json(notFoundError(path), { status: 404 });
    }
    if (!canView(user, ticket)) {
      return HttpResponse.json(
        forbiddenError(path, "You are not permitted to view this ticket."),
        { status: 403 },
      );
    }
    const detail: TicketDetail = {
      ...ticket,
      comments: commentStore[ticket.id] ?? [],
    };
    return HttpResponse.json(detail);
  }),

  http.patch(`${BASE_URL}/api/v1/tickets/:ticketId`, async ({ params, request }) => {
    const path = `/api/v1/tickets/${params.ticketId}`;
    const user = userFromRequest(request);
    if (!user) {
      return HttpResponse.json(unauthorizedError(path), { status: 401 });
    }
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json(notFoundError(path), { status: 404 });
    }

    const body = (await request.json()) as Partial<Ticket>;
    if (body.title !== undefined && body.title.trim() === "") {
      return HttpResponse.json(
        validationError(path, "title", "Title must not be blank"),
        { status: 400 },
      );
    }
    if (body.description !== undefined && body.description.trim() === "") {
      return HttpResponse.json(
        validationError(path, "description", "Description must not be blank"),
        { status: 400 },
      );
    }

    Object.assign(ticket, {
      title: body.title ?? ticket.title,
      description: body.description ?? ticket.description,
      priority: body.priority ?? ticket.priority,
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(ticket);
  }),

  http.post(
    `${BASE_URL}/api/v1/tickets/:ticketId/reassign`,
    async ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/reassign`;
      const user = userFromRequest(request);
      if (!user) {
        return HttpResponse.json(unauthorizedError(path), { status: 401 });
      }
      if (user.role !== "ADMIN") {
        return HttpResponse.json(
          forbiddenError(path, "Only an ADMIN may reassign a ticket."),
          { status: 403 },
        );
      }
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
      }

      const body = (await request.json()) as { assigneeId?: string };
      const newAssignee = MOCK_USERS.find(
        (u) => u.id === body.assigneeId && u.role === "SUPPORT",
      );
      if (!newAssignee) {
        return HttpResponse.json(
          validationError(path, "assigneeId", "Not a valid SUPPORT user."),
          { status: 400 },
        );
      }

      ticket.assignee = newAssignee;
      ticket.updatedAt = new Date().toISOString();
      return HttpResponse.json(ticket);
    },
  ),

  http.post(
    `${BASE_URL}/api/v1/tickets/:ticketId/transitions`,
    async ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/transitions`;
      const user = userFromRequest(request);
      if (!user) {
        return HttpResponse.json(unauthorizedError(path), { status: 401 });
      }
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
      }

      const body = (await request.json()) as { status: Status };
      const allowed = ALLOWED_TRANSITIONS[ticket.status];
      if (!allowed.includes(body.status)) {
        return HttpResponse.json(
          conflictError(
            path,
            `Cannot transition ticket from ${ticket.status} to ${body.status}`,
          ),
          { status: 409 },
        );
      }

      ticket.status = body.status;
      ticket.updatedAt = new Date().toISOString();
      return HttpResponse.json(ticket);
    },
  ),

  // --- Comments ---
  http.get(
    `${BASE_URL}/api/v1/tickets/:ticketId/comments`,
    ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/comments`;
      const user = userFromRequest(request);
      if (!user) {
        return HttpResponse.json(unauthorizedError(path), { status: 401 });
      }
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
      }
      if (!canView(user, ticket)) {
        return HttpResponse.json(
          forbiddenError(path, "You are not permitted to view this ticket."),
          { status: 403 },
        );
      }

      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "0");
      const size = Number(url.searchParams.get("size") ?? "20");

      const all = commentStore[ticket.id] ?? [];
      const start = page * size;
      const content = all.slice(start, start + size);

      const body: CommentPage = {
        content,
        page,
        size,
        totalElements: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / size)),
      };
      return HttpResponse.json(body);
    },
  ),

  http.post(
    `${BASE_URL}/api/v1/tickets/:ticketId/comments`,
    async ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/comments`;
      const user = userFromRequest(request);
      if (!user) {
        return HttpResponse.json(unauthorizedError(path), { status: 401 });
      }
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
      }
      if (!canComment(user, ticket)) {
        return HttpResponse.json(
          forbiddenError(
            path,
            "Only the ticket's creator or assignee may comment.",
          ),
          { status: 403 },
        );
      }

      const body = (await request.json()) as { content?: string };
      if (!body.content || body.content.trim() === "") {
        return HttpResponse.json(
          validationError(path, "content", "Content must not be blank"),
          { status: 400 },
        );
      }

      const comment: Comment = {
        id: String(nextCommentId++),
        ticketId: ticket.id,
        content: body.content,
        author: user,
        createdAt: new Date().toISOString(),
      };
      commentStore[ticket.id] = [...(commentStore[ticket.id] ?? []), comment];
      return HttpResponse.json(comment, { status: 201 });
    },
  ),

  // --- Chatbot ---
  http.post(
    `${BASE_URL}/api/v1/chatbot/conversations/:conversationId/queries`,
    async ({ params, request }) => resolveChatbotQuery(params.conversationId as string, request),
  ),
  http.post(`${BASE_URL}/api/v1/chatbot/conversations/queries`, async ({ request }) =>
    resolveChatbotQuery(undefined, request),
  ),
];

async function resolveChatbotQuery(conversationId: string | undefined, request: Request) {
  const path = "/api/v1/chatbot/conversations/queries";
  const user = userFromRequest(request);
  if (!user) {
    return HttpResponse.json(unauthorizedError(path), { status: 401 });
  }

  const body = (await request.json()) as { query?: string };
  const query = body.query?.trim() ?? "";
  if (!query) {
    return HttpResponse.json(
      validationError(path, "query", "Query must not be blank"),
      { status: 400 },
    );
  }

  const resolvedConversationId = conversationId ?? `conv-${nextConversationId++}`;

  if (/unavailable|fail/i.test(query)) {
    return HttpResponse.json(serviceUnavailableError(path), { status: 503 });
  }

  if (/nomatch/i.test(query)) {
    return HttpResponse.json({
      conversationId: resolvedConversationId,
      turnId: `turn-${Date.now()}`,
      status: "no-match",
      response: null,
      sourceTickets: [],
    });
  }

  const firstTicket = ticketStore[0];
  return HttpResponse.json({
    conversationId: resolvedConversationId,
    turnId: `turn-${Date.now()}`,
    status: "answered",
    response: "Restart the affected service; this resolved the same issue previously.",
    sourceTickets: firstTicket ? [`Ticket #${firstTicket.id}`] : ["Ticket #1"],
  });
}
