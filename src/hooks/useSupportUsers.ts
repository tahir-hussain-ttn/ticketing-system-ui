import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/usersApi";
import { shouldRetryOnError } from "../api/http";

export function useSupportUsers() {
  return useQuery({
    queryKey: ["users", "SUPPORT"],
    queryFn: () => usersApi.listByRole("SUPPORT"),
    retry: shouldRetryOnError,
  });
}
