import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";

export function useReassignTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assigneeId: string) => ticketsApi.reassign(ticketId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });
}
