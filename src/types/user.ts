export type Role = "SUPPORT" | "GENERAL" | "ADMIN";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface AuthSession {
  user: User;
  token: string;
}
