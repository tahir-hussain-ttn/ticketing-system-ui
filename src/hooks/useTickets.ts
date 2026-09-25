import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";
import { shouldRetryOnError } from "../api/http";
import type { TicketListParams } from "../types/requests";

export function useTickets(params: TicketListParams) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => ticketsApi.list(params),
    retry: shouldRetryOnError,
  });
}
