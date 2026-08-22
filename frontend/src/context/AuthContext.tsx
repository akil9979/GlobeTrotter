import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { authService } from "../services/authService";
import type { AuthResponse, LoginInput, RegistrationInput, User } from "../types/auth";

const tokenKey = "globetrotter_token";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  updateUser: (input: Partial<Pick<User, "name" | "email" | "profileImage" | "language">>) => Promise<void>;
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

  const login = async (input: LoginInput): Promise<void> => {
    setSession(await authService.login(input));
  };

  const register = async (input: RegistrationInput): Promise<void> => {
    setSession(await authService.register(input));
  };

  const updateUser = async (input: Partial<Pick<User, "name" | "email" | "profileImage" | "language">>): Promise<void> => {
    setUser(await authService.updateCurrentUser(input));
  };

  useEffect(() => {
    if (!localStorage.getItem(tokenKey)) {
      setIsLoading(false);
      return;
    }
    authService.getCurrentUser().then(setUser).catch(logout).finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, updateUser, logout }),
    [user, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
