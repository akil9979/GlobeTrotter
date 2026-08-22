import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { authService } from "../services/authService";
import type { AuthResponse, User } from "../types/auth";

const tokenKey = "globetrotter_token";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = (): void => {
    localStorage.removeItem(tokenKey);
    setUser(null);
  };

  const setSession = (session: AuthResponse): void => {
    localStorage.setItem(tokenKey, session.token);
    setUser(session.user);
  };

  useEffect(() => {
    if (!localStorage.getItem(tokenKey)) {
      setIsLoading(false);
      return;
    }
    authService.getCurrentUser().then(setUser).catch(logout).finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(() => ({ user, isLoading, isAuthenticated: user !== null, setSession, logout }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
