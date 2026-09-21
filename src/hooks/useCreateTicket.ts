import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
