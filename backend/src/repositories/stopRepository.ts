import { db } from "../config/db.js";
import type { ReorderItem, StopInput } from "../types/api.js";

const stopFields = "s.id, s.trip_id AS \"tripId\", s.city_id AS \"cityId\", c.name AS \"cityName\", c.country AS \"cityCountry\", s.stop_order AS \"stopOrder\", s.arrival_date AS \"arrivalDate\", s.departure_date AS \"departureDate\", s.notes, s.created_at AS \"createdAt\", s.updated_at AS \"updatedAt\"";
const ownedTrip = "EXISTS (SELECT 1 FROM trips t WHERE t.id = s.trip_id AND t.user_id = $2)";

export const stopRepository = {
  async list(tripId: string, userId: string) {
    return (await db.query(`SELECT ${stopFields} FROM trip_stops s JOIN cities c ON c.id = s.city_id WHERE s.trip_id = $1 AND ${ownedTrip} ORDER BY s.stop_order`, [tripId, userId])).rows;
  },
  async create(tripId: string, input: StopInput) {
    return (await db.query(`INSERT INTO trip_stops (trip_id, city_id, stop_order, arrival_date, departure_date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [tripId, input.cityId, input.stopOrder, input.arrivalDate, input.departureDate, input.notes ?? null])).rows[0];
  },
  async findOwned(id: string, tripId: string, userId: string) {
    return (await db.query(`SELECT ${stopFields} FROM trip_stops s JOIN cities c ON c.id = s.city_id WHERE s.id = $1 AND s.trip_id = $2 AND EXISTS (SELECT 1 FROM trips t WHERE t.id = s.trip_id AND t.user_id = $3)`, [id, tripId, userId])).rows[0];
  },
  async update(id: string, tripId: string, input: Partial<StopInput>) {
    const columns: Record<string, string> = { cityId: "city_id", stopOrder: "stop_order", arrivalDate: "arrival_date", departureDate: "departure_date", notes: "notes" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined); const values = entries.map(([, value]) => value);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    return (await db.query(`UPDATE trip_stops SET ${setClause} WHERE id = $${values.length + 1} AND trip_id = $${values.length + 2} RETURNING id`, [...values, id, tripId])).rows[0];
  },
  async remove(id: string, tripId: string) { return (await db.query("DELETE FROM trip_stops WHERE id = $1 AND trip_id = $2 RETURNING id", [id, tripId])).rows[0]; },
  async reorder(tripId: string, items: ReorderItem[]) {
    const client = await db.connect();
    try { await client.query("BEGIN"); await client.query("UPDATE trip_stops SET stop_order = stop_order + 1000000 WHERE trip_id = $1", [tripId]);
      for (const item of items) await client.query("UPDATE trip_stops SET stop_order = $1 WHERE id = $2 AND trip_id = $3", [item.order, item.id, tripId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  },
};
