import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";
import type { TicketListParams } from "../types/requests";

export function useTickets(params: TicketListParams) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => ticketsApi.list(params),
  });
}
