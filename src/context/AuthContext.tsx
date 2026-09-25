import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types/user";
import { authApi } from "../api/authApi";
import { getSession, setSession, clearSession, onSessionExpired } from "../auth/session";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSession() ?? null);

  useEffect(() => {
    return onSessionExpired(() => setUser(null));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const loggedInUser = await authApi.login({ email, password });
    if (!loggedInUser?.id) {
      throw new Error("Login response was missing the expected user fields.");
    }
    setSession(loggedInUser);
    setUser(loggedInUser);
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
