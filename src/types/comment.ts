import type { User } from "./user";

export interface Comment {
  id: string;
  ticketId: string;
  content: string;
  author: User;
  createdAt: string;
}

export interface CommentPage {
  content: Comment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
