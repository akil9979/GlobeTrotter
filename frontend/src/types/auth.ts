export interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  language: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegistrationInput extends LoginInput {
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
