import { db } from "../config/db.js";

const activityFields = "id, city_id AS \"cityId\", name, description, category, duration_minutes AS \"durationMinutes\", estimated_cost AS \"estimatedCost\", image, created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

export const activityRepository = {
  async searchByCity(cityId: string, query: string, limit: number) {
    return (await db.query(`SELECT ${activityFields} FROM activities WHERE city_id = $1 AND (name ILIKE $2 OR description ILIKE $2) ORDER BY name LIMIT $3`, [cityId, `%${query}%`, limit])).rows;
  },
  async findById(id: string) {
    return (await db.query(`SELECT ${activityFields} FROM activities WHERE id = $1`, [id])).rows[0];
  },
};
