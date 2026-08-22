import { db } from "../config/db.js";
import type { ActivitySearchParams } from "../types/api.js";

const activityFields = "id, city_id AS \"cityId\", name, description, category, duration_minutes AS \"durationMinutes\", estimated_cost AS \"estimatedCost\", image, created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

export const activityRepository = {
  async search(params: ActivitySearchParams) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown): void => { values.push(value); clauses.push(`${column} $${values.length}`); };
    if (params.cityId) add("city_id =", params.cityId);
    if (params.category) add("category =", params.category);
    if (params.search) {
      values.push(`%${params.search}%`);
      clauses.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }
    if (params.minCost !== undefined) add("estimated_cost >=", params.minCost);
    if (params.maxCost !== undefined) add("estimated_cost <=", params.maxCost);
    if (params.minDuration !== undefined) add("duration_minutes >=", params.minDuration);
    if (params.maxDuration !== undefined) add("duration_minutes <=", params.maxDuration);
    values.push(params.limit);
    return (await db.query(`SELECT ${activityFields} FROM activities ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY name ASC LIMIT $${values.length}`, values)).rows;
  },
  async findById(id: string) {
    return (await db.query(`SELECT ${activityFields} FROM activities WHERE id = $1`, [id])).rows[0];
  },
};
