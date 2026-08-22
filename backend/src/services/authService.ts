import bcrypt from "bcrypt";
import { createAccessToken } from "../config/jwt.js";
import { userRepository } from "../repositories/userRepository.js";
import type { LoginInput, RegisterInput } from "../types/auth.js";
import { HttpError } from "../types/errors.js";

const saltRounds = 12;

const toAuthResponse = (user: { id: string; email: string }) => ({
  user,
  token: createAccessToken({ userId: user.id, email: user.email }),
});

export const authService = {
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    if (await userRepository.findByEmail(email)) throw new HttpError("An account with this email already exists.", 409);
    const passwordHash = await bcrypt.hash(input.password, saltRounds);
    const user = await userRepository.create(input.name.trim(), email, passwordHash);
    return toAuthResponse(user);
  },
  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError("Invalid email or password.", 401);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return toAuthResponse(safeUser);
  },
  async getCurrentUser(userId: string) {
    const user = await userRepository.findSafeById(userId);
    if (!user) throw new HttpError("Authenticated user no longer exists.", 401);
    return user;
  },
};
