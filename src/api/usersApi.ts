import { request } from "./http";
import type { User, Role } from "../types/user";

export const usersApi = {
  listByRole(role: Role): Promise<User[]> {
    return request<User[]>("/api/v1/users", {
      method: "GET",
      query: { role },
    });
  },
};
