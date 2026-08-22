import { db } from "../config/db.js";
import type { TripInput } from "../types/api.js";

const tripFields = "id, user_id AS \"userId\", name, description, start_date AS \"startDate\", end_date AS \"endDate\", cover_image AS \"coverImage\", budget, is_public AS \"isPublic\", created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

export const tripRepository = {
  async create(userId: string, input: TripInput) {
    const result = await db.query(`INSERT INTO trips (user_id, name, description, start_date, end_date, cover_image, budget, is_public)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${tripFields}`, [userId, input.name, input.description ?? null, input.startDate, input.endDate, input.coverImage ?? null, input.budget ?? null, input.isPublic ?? false]);
    return result.rows[0];
  },
  async listByUser(userId: string) {
    return (await db.query(`SELECT ${tripFields} FROM trips WHERE user_id = $1 ORDER BY start_date DESC, created_at DESC`, [userId])).rows;
  },
  async findOwned(id: string, userId: string) {
    return (await db.query(`SELECT ${tripFields} FROM trips WHERE id = $1 AND user_id = $2`, [id, userId])).rows[0];
  },
  async update(id: string, userId: string, input: Partial<TripInput>) {
    const columns: Record<string, string> = { name: "name", description: "description", startDate: "start_date", endDate: "end_date", coverImage: "cover_image", budget: "budget", isPublic: "is_public" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    return (await db.query(`UPDATE trips SET ${setClause} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING ${tripFields}`, [...values, id, userId])).rows[0];
  },
  async remove(id: string, userId: string) {
    return (await db.query("DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId])).rows[0];
  },
};
