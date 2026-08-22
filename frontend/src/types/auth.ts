export interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  language: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
