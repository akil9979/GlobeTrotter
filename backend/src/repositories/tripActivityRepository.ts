import { db } from "../config/db.js";
import type { ReorderItem, TripActivityInput } from "../types/api.js";

const fields = "ta.id, ta.trip_id AS \"tripId\", ta.trip_stop_id AS \"tripStopId\", ta.activity_id AS \"activityId\", a.name AS \"activityName\", ta.activity_date AS \"activityDate\", ta.start_time AS \"startTime\", ta.end_time AS \"endTime\", ta.custom_cost AS \"customCost\", ta.status, ta.sort_order AS \"sortOrder\", ta.notes, ta.created_at AS \"createdAt\", ta.updated_at AS \"updatedAt\"";

export const tripActivityRepository = {
  async list(tripId: string, userId: string) {
    return (await db.query(`SELECT ${fields} FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id JOIN trips t ON t.id = ta.trip_id WHERE ta.trip_id = $1 AND t.user_id = $2 ORDER BY ta.activity_date, ta.start_time NULLS LAST, ta.sort_order`, [tripId, userId])).rows;
  },
  async create(tripId: string, input: TripActivityInput) {
    return (await db.query(`INSERT INTO trip_activities (trip_id, trip_stop_id, activity_id, activity_date, start_time, end_time, custom_cost, status, sort_order, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [tripId, input.tripStopId, input.activityId, input.activityDate, input.startTime ?? null, input.endTime ?? null, input.customCost ?? null, input.status ?? "planned", input.sortOrder ?? 1, input.notes ?? null])).rows[0];
  },
  async findOwned(id: string, tripId: string, userId: string) {
    return (await db.query(`SELECT ${fields} FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id JOIN trips t ON t.id = ta.trip_id WHERE ta.id = $1 AND ta.trip_id = $2 AND t.user_id = $3`, [id, tripId, userId])).rows[0];
  },
  async update(id: string, tripId: string, input: Partial<TripActivityInput>) {
    const columns: Record<string, string> = { tripStopId: "trip_stop_id", activityId: "activity_id", activityDate: "activity_date", startTime: "start_time", endTime: "end_time", customCost: "custom_cost", status: "status", sortOrder: "sort_order", notes: "notes" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined); const values = entries.map(([, value]) => value);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    return (await db.query(`UPDATE trip_activities SET ${setClause} WHERE id = $${values.length + 1} AND trip_id = $${values.length + 2} RETURNING id`, [...values, id, tripId])).rows[0];
  },
  async remove(id: string, tripId: string) { return (await db.query("DELETE FROM trip_activities WHERE id = $1 AND trip_id = $2 RETURNING id", [id, tripId])).rows[0]; },
  async listIds(tripId: string) { return (await db.query<{ id: string }>("SELECT id FROM trip_activities WHERE trip_id = $1", [tripId])).rows; },
  async findOverlaps(tripId: string, activityDate: string, startTime: string, endTime: string, excludedId?: string) {
    const result = await db.query(`SELECT ta.id, a.name AS \"activityName\", ta.start_time AS \"startTime\", ta.end_time AS \"endTime\" FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id
      WHERE ta.trip_id = $1 AND ta.activity_date = $2 AND ta.status <> 'cancelled' AND ta.start_time IS NOT NULL AND ta.end_time IS NOT NULL
      AND ta.start_time < $3 AND ta.end_time > $4 ${excludedId ? "AND ta.id <> $5" : ""} ORDER BY ta.start_time`, excludedId ? [tripId, activityDate, endTime, startTime, excludedId] : [tripId, activityDate, endTime, startTime]);
    return result.rows;
  },
  async reorder(tripId: string, items: ReorderItem[]) {
    const client = await db.connect();
    try { await client.query("BEGIN"); await client.query("UPDATE trip_activities SET sort_order = sort_order + 1000000 WHERE trip_id = $1", [tripId]);
      for (const item of items) await client.query("UPDATE trip_activities SET sort_order = $1 WHERE id = $2 AND trip_id = $3", [item.order, item.id, tripId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  },
};
