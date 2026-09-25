import { request } from "./http";
import type { Ticket, TicketDetail, TicketPage } from "../types/ticket";
import type {
  TicketCreateRequest,
  TicketListParams,
  TicketTransitionRequest,
  TicketUpdateRequest,
} from "../types/requests";

export const ticketsApi = {
  list(params: TicketListParams = {}): Promise<TicketPage> {
    return request<TicketPage>("/api/v1/tickets", {
      method: "GET",
      query: {
        q: params.q,
        status: params.status,
        scope: params.scope,
        page: params.page,
        size: params.size,
      },
    });
  },

  create(body: TicketCreateRequest): Promise<Ticket> {
    return request<Ticket>("/api/v1/tickets", {
      method: "POST",
      body,
    });
  },

  reassign(id: string, assigneeId: string): Promise<Ticket> {
    return request<Ticket>(`/api/v1/tickets/${id}/reassign`, {
      method: "POST",
      body: { assigneeId },
    });
  },

  getById(id: string): Promise<TicketDetail> {
    return request<TicketDetail>(`/api/v1/tickets/${id}`, {
      method: "GET",
    });
  },

  update(id: string, body: TicketUpdateRequest): Promise<Ticket> {
    return request<Ticket>(`/api/v1/tickets/${id}`, {
      method: "PATCH",
      body,
    });
  },

  transition(id: string, body: TicketTransitionRequest): Promise<Ticket> {
    return request<Ticket>(`/api/v1/tickets/${id}/transitions`, {
      method: "POST",
      body,
    });
  },
};
