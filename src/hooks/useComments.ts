import { useQuery } from "@tanstack/react-query";
import { commentsApi } from "../api/commentsApi";

export function useComments(ticketId: string, page: number) {
  return useQuery({
    queryKey: ["comments", ticketId, page],
    queryFn: () => commentsApi.list(ticketId, { page }),
  });
}
