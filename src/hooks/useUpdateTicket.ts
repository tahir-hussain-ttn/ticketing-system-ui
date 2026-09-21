import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";
import type { TicketUpdateRequest } from "../types/requests";

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TicketUpdateRequest) => ticketsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
