import { apiClient } from "../api/client";
import type { AuthResponse, LoginInput, RegistrationInput, User } from "../types/auth";

export const authService = {
  register: (input: RegistrationInput) =>
    apiClient<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: LoginInput) =>
    apiClient<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  getCurrentUser: async (): Promise<User> => (await apiClient<{ user: User }>("/auth/me")).user,
  updateCurrentUser: async (input: Partial<Pick<User, "name" | "email" | "profileImage" | "language">>): Promise<User> =>
    (await apiClient<{ user: User }>("/auth/me", { method: "PUT", body: JSON.stringify(input) })).user,
  deleteCurrentUser: () => apiClient<void>("/auth/me", { method: "DELETE" }),
};
