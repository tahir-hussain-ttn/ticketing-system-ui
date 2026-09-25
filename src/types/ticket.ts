import type { Comment } from "./comment";
import type { User } from "./user";

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
  assignee: User | null;
  creator: User;
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
