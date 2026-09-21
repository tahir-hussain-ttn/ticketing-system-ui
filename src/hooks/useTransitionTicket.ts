import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";
import type { Status } from "../types/ticket";

export function useTransitionTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: Status) => ticketsApi.transition(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
