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
  async updateCurrentUser(userId: string, input: { name?: string; email?: string; profileImage?: string | null; language?: string }) {
    const update = { ...input };
    if (update.name !== undefined) update.name = update.name.trim();
    if (update.email !== undefined) {
      update.email = update.email.trim().toLowerCase();
      const existing = await userRepository.findByEmail(update.email);
      if (existing && existing.id !== userId) throw new HttpError("An account with this email already exists.", 409);
    }
    const user = await userRepository.update(userId, update);
    if (!user) throw new HttpError("Authenticated user no longer exists.", 401);
    return user;
  },
  async removeCurrentUser(userId: string) {
    if (!await userRepository.remove(userId)) throw new HttpError("Authenticated user no longer exists.", 401);
  },
};
