import { db } from "../config/db.js";
import type { CitySearchParams } from "../types/api.js";

const cityFields = "id, name, country, country_code AS \"countryCode\", region, description, image, cost_index AS \"costIndex\", popularity, latitude, longitude";

export const cityRepository = {
  async search(params: CitySearchParams) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (clause: string, value: unknown): void => { values.push(value); clauses.push(clause.replace("?", `$${values.length}`)); };

    if (params.search) {
      values.push(`%${params.search}%`);
      clauses.push(`(name ILIKE $${values.length} OR country ILIKE $${values.length} OR region ILIKE $${values.length})`);
    }
    if (params.country) add("country ILIKE ?", `%${params.country}%`);
    if (params.region) add("region ILIKE ?", `%${params.region}%`);
    if (params.minCostIndex !== undefined) add("cost_index >= ?", params.minCostIndex);
    if (params.maxCostIndex !== undefined) add("cost_index <= ?", params.maxCostIndex);

    values.push(params.limit);
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return (await db.query(`SELECT ${cityFields} FROM cities ${whereClause} ORDER BY popularity DESC NULLS LAST, name ASC LIMIT $${values.length}`, values)).rows;
  },
  async findById(id: string) {
    return (await db.query(`SELECT ${cityFields} FROM cities WHERE id = $1`, [id])).rows[0];
  },
};
