import { http, HttpResponse } from "msw";
import type { Comment, CommentPage } from "../../src/types/comment";
import type { Status, Ticket, TicketDetail, TicketPage } from "../../src/types/ticket";
import type { ApiError } from "../../src/types/apiError";

const BASE_URL = "http://localhost:8080";

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

/** Mirrors the backend's state machine (spec.md FR-010). */
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

export const handlers = [
  http.get(`${BASE_URL}/api/v1/tickets`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase();
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "20");

    let filtered = ticketStore;
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
    const body = (await request.json()) as Partial<Ticket>;

    if (!body.title || body.title.trim() === "") {
      return HttpResponse.json(
        validationError("/api/v1/tickets", "title", "Title must not be blank"),
        { status: 400 },
      );
    }
    if (!body.description || body.description.trim() === "") {
      return HttpResponse.json(
        validationError(
          "/api/v1/tickets",
          "description",
          "Description must not be blank",
        ),
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: String(nextTicketId++),
      title: body.title,
      description: body.description,
      priority: body.priority ?? "LOW",
      status: "OPEN",
      assignee: body.assignee,
      createdAt: now,
      updatedAt: now,
    };
    ticketStore.push(ticket);
    commentStore[ticket.id] = [];
    return HttpResponse.json(ticket, { status: 201 });
  }),

  http.get(`${BASE_URL}/api/v1/tickets/:ticketId`, ({ params }) => {
    const ticket = findTicket(params.ticketId as string);
    if (!ticket) {
      return HttpResponse.json(
        notFoundError(`/api/v1/tickets/${params.ticketId}`),
        { status: 404 },
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
      assignee: body.assignee,
      updatedAt: new Date().toISOString(),
    });
    return HttpResponse.json(ticket);
  }),

  http.post(
    `${BASE_URL}/api/v1/tickets/:ticketId/transitions`,
    async ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/transitions`;
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

  http.get(
    `${BASE_URL}/api/v1/tickets/:ticketId/comments`,
    ({ params, request }) => {
      const path = `/api/v1/tickets/${params.ticketId}/comments`;
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
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
      const ticket = findTicket(params.ticketId as string);
      if (!ticket) {
        return HttpResponse.json(notFoundError(path), { status: 404 });
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
        createdAt: new Date().toISOString(),
      };
      commentStore[ticket.id] = [...(commentStore[ticket.id] ?? []), comment];
      return HttpResponse.json(comment, { status: 201 });
    },
  ),
];
