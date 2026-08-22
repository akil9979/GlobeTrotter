import { db } from "../config/db.js";
import type { SafeUser, UserWithPassword } from "../types/auth.js";

const safeUserFields = "id, name, email, profile_image AS \"profileImage\", language, created_at AS \"createdAt\", updated_at AS \"updatedAt\"";
const passwordUserFields = `${safeUserFields}, password_hash AS \"passwordHash\"`;

export const userRepository = {
  async create(name: string, email: string, passwordHash: string): Promise<SafeUser> {
    const result = await db.query<SafeUser>(`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${safeUserFields}`, [name, email, passwordHash]);
    return result.rows[0];
  },
  async findByEmail(email: string): Promise<UserWithPassword | undefined> {
    const result = await db.query<UserWithPassword>(`SELECT ${passwordUserFields} FROM users WHERE email = $1`, [email]);
    return result.rows[0];
  },
  async findSafeById(id: string): Promise<SafeUser | undefined> {
    const result = await db.query<SafeUser>(`SELECT ${safeUserFields} FROM users WHERE id = $1`, [id]);
    return result.rows[0];
  },
  async update(id: string, input: Partial<Pick<SafeUser, "name" | "email" | "profileImage" | "language">>): Promise<SafeUser | undefined> {
    const columns: Record<string, string> = { name: "name", email: "email", profileImage: "profile_image", language: "language" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    if (!entries.length) return this.findSafeById(id);
    const values = entries.map(([, value]) => value);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    const result = await db.query<SafeUser>(`UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING ${safeUserFields}`, [...values, id]);
    return result.rows[0];
  },
  async remove(id: string): Promise<boolean> {
    const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    return result.rowCount === 1;
  },
};
