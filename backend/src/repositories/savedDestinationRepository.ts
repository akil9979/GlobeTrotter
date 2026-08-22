import { db } from "../config/db.js";

const cityFields = "c.id, c.name, c.country, c.country_code AS \"countryCode\", c.region, c.description, c.image, c.cost_index AS \"costIndex\", c.popularity, c.latitude, c.longitude";

export const savedDestinationRepository = {
  async list(userId: string) {
    return (await db.query(`SELECT sd.id AS \"savedDestinationId\", sd.created_at AS \"savedAt\", ${cityFields} FROM saved_destinations sd JOIN cities c ON c.id = sd.city_id WHERE sd.user_id = $1 ORDER BY sd.created_at DESC`, [userId])).rows;
  },
  async save(userId: string, cityId: string) {
    return (await db.query(`INSERT INTO saved_destinations (user_id, city_id) VALUES ($1, $2) ON CONFLICT (user_id, city_id) DO UPDATE SET city_id = EXCLUDED.city_id RETURNING id AS \"savedDestinationId\"`, [userId, cityId])).rows[0];
  },
  async remove(userId: string, cityId: string) {
    return (await db.query("DELETE FROM saved_destinations WHERE user_id = $1 AND city_id = $2 RETURNING id", [userId, cityId])).rowCount === 1;
  },
};
