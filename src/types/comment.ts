export interface Comment {
  id: string;
  ticketId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface CommentPage {
  content: Comment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
