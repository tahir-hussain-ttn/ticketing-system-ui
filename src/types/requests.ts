import type { Priority, Status } from "./ticket";

export interface TicketCreateRequest {
  title: string;
  description: string;
  priority: Priority;
}

export interface TicketUpdateRequest {
  title?: string;
  description?: string;
  priority?: Priority;
}

export interface TicketTransitionRequest {
  status: Status;
}

export type TicketOwnershipScope = "created" | "assigned" | "all";

export interface TicketListParams {
  q?: string;
  status?: Status;
  scope?: TicketOwnershipScope;
  page?: number;
  size?: number;
}

export interface CommentCreateRequest {
  content: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ReassignRequest {
  assigneeId: string;
}
