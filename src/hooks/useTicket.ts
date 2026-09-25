import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";
import { shouldRetryOnError } from "../api/http";

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsApi.getById(id),
    retry: shouldRetryOnError,
  });
}
