import { apiClient } from "../api/client";
import type { AuthResponse, LoginInput, RegistrationInput, User } from "../types/auth";

export const authService = {
  register: (input: RegistrationInput) =>
    apiClient<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: LoginInput) =>
    apiClient<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  getCurrentUser: async (): Promise<User> => (await apiClient<{ user: User }>("/auth/me")).user,
};
