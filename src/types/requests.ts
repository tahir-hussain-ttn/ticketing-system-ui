import type { Priority, Status } from "./ticket";

export interface TicketCreateRequest {
  title: string;
  description: string;
  priority: Priority;
  assignee?: string;
}

export interface TicketUpdateRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  assignee?: string;
}

export interface TicketTransitionRequest {
  status: Status;
}

export interface TicketListParams {
  q?: string;
  status?: Status;
  page?: number;
  size?: number;
}

export interface CommentCreateRequest {
  content: string;
}
