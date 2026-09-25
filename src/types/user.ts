export type Role = "SUPPORT" | "GENERAL" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
