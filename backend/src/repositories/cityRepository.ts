import { db } from "../config/db.js";

const cityFields = "id, name, country, country_code AS \"countryCode\", region, description, image, cost_index AS \"costIndex\", popularity, latitude, longitude";

export const cityRepository = {
  async search(query: string, limit: number) {
    return (await db.query(`SELECT ${cityFields} FROM cities WHERE name ILIKE $1 OR country ILIKE $1 ORDER BY popularity DESC NULLS LAST, name LIMIT $2`, [`%${query}%`, limit])).rows;
  },
  async findById(id: string) {
    return (await db.query(`SELECT ${cityFields} FROM cities WHERE id = $1`, [id])).rows[0];
  },
};
