import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";

export function useLogout() {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: () => logout(),
  });
}
