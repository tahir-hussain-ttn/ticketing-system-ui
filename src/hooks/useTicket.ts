import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/ticketsApi";

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsApi.getById(id),
  });
}
