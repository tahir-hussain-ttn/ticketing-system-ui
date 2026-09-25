import { request } from "./http";
import type { AuthSession } from "../types/user";
import type { LoginRequest } from "../types/requests";

export const authApi = {
  login(body: LoginRequest): Promise<AuthSession> {
    return request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body,
    });
  },

  logout(): Promise<void> {
    return request<void>("/api/v1/auth/logout", {
      method: "POST",
    });
  },
};
