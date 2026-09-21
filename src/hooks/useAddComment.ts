import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../api/commentsApi";
import type { CommentCreateRequest } from "../types/requests";

export function useAddComment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CommentCreateRequest) =>
      commentsApi.addComment(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}
