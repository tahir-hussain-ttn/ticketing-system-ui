import type { Comment } from "./comment";

export interface UserSummary {
  id: string;
  name: string;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type Status =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export const STATUSES: Status[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignee: UserSummary | null;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
}

export interface TicketPage {
  content: Ticket[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
