export interface SafeUser {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends SafeUser {
  passwordHash: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
