import { request } from "./http";
import type { Comment, CommentPage } from "../types/comment";
import type { CommentCreateRequest } from "../types/requests";

export const commentsApi = {
  list(
    ticketId: string,
    params: { page?: number; size?: number } = {},
  ): Promise<CommentPage> {
    return request<CommentPage>(`/api/v1/tickets/${ticketId}/comments`, {
      method: "GET",
      query: { page: params.page, size: params.size },
    });
  },

  addComment(ticketId: string, body: CommentCreateRequest): Promise<Comment> {
    return request<Comment>(`/api/v1/tickets/${ticketId}/comments`, {
      method: "POST",
      body,
    });
  },
};
