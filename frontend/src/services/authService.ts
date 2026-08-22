import { apiClient } from "../api/client";
import type { AuthResponse, User } from "../types/auth";

export const authService = {
  register: (input: { name: string; email: string; password: string }) =>
    apiClient<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    apiClient<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  getCurrentUser: async (): Promise<User> => (await apiClient<{ user: User }>("/auth/me")).user,
};
