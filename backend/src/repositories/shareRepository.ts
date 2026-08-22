import { randomBytes } from "node:crypto";
import { db } from "../config/db.js";

const createToken = (): string => randomBytes(32).toString("base64url");

export const shareRepository = {
  async create(tripId: string) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE trips SET is_public = TRUE WHERE id = $1", [tripId]);
      const result = await client.query(`INSERT INTO shared_trips (trip_id, share_token) VALUES ($1, $2)
        ON CONFLICT (trip_id) DO UPDATE SET share_token = EXCLUDED.share_token, created_at = NOW(), expires_at = NULL
        RETURNING share_token AS \"shareToken\", created_at AS \"createdAt\", expires_at AS \"expiresAt\"`, [tripId, createToken()]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  },
  async revoke(tripId: string) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM shared_trips WHERE trip_id = $1", [tripId]);
      await client.query("UPDATE trips SET is_public = FALSE WHERE id = $1", [tripId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  },
  async findPublicItinerary(shareToken: string) {
    const result = await db.query<{ itinerary: unknown }>(`
      WITH shared_trip AS (
        SELECT t.id, t.name, t.description, t.start_date, t.end_date, t.budget
        FROM shared_trips st JOIN trips t ON t.id = st.trip_id
        WHERE st.share_token = $1 AND t.is_public = TRUE AND (st.expires_at IS NULL OR st.expires_at > NOW())
      ), dates AS (
        SELECT generate_series(start_date::timestamp, end_date::timestamp, interval '1 day')::DATE AS date FROM shared_trip
      ), activity_days AS (
        SELECT ta.activity_date, COALESCE(SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)), 0) AS estimated_cost,
          jsonb_agg(jsonb_build_object('name', a.name, 'category', a.category, 'startTime', ta.start_time, 'endTime', ta.end_time, 'durationMinutes', a.duration_minutes, 'cost', COALESCE(ta.custom_cost, a.estimated_cost, 0), 'notes', ta.notes, 'sortOrder', ta.sort_order) ORDER BY ta.sort_order, ta.start_time NULLS LAST) AS activities
        FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id JOIN shared_trip t ON t.id = ta.trip_id
        WHERE ta.status <> 'cancelled' GROUP BY ta.activity_date
      ), expense_days AS (
        SELECT e.expense_date, COALESCE(SUM(e.amount), 0) AS total FROM expenses e JOIN shared_trip t ON t.id = e.trip_id GROUP BY e.expense_date
      ), totals AS (
        SELECT COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN shared_trip t ON t.id = e.trip_id), 0) AS spent,
          COALESCE((SELECT SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)) FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id JOIN shared_trip t ON t.id = ta.trip_id WHERE ta.status <> 'cancelled'), 0) AS estimated
      )
      SELECT jsonb_build_object(
        'trip', jsonb_build_object('id', t.id, 'name', t.name, 'description', t.description, 'startDate', t.start_date, 'endDate', t.end_date, 'plannedBudget', t.budget),
        'days', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'date', d.date,
          'city', (SELECT jsonb_build_object('name', c.name, 'country', c.country, 'countryCode', c.country_code, 'region', c.region, 'image', c.image) FROM trip_stops ts JOIN cities c ON c.id = ts.city_id WHERE ts.trip_id = t.id AND d.date BETWEEN ts.arrival_date AND ts.departure_date ORDER BY ts.stop_order LIMIT 1),
          'activities', COALESCE(ad.activities, '[]'::jsonb),
          'dailyCost', jsonb_build_object('actualExpenses', COALESCE(ed.total, 0), 'estimatedActivities', COALESCE(ad.estimated_cost, 0), 'totalCommitted', COALESCE(ed.total, 0) + COALESCE(ad.estimated_cost, 0))
        ) ORDER BY d.date) FROM dates d LEFT JOIN activity_days ad ON ad.activity_date = d.date LEFT JOIN expense_days ed ON ed.expense_date = d.date), '[]'::jsonb),
        'summary', jsonb_build_object('totalSpent', totals.spent, 'estimatedActivityCost', totals.estimated, 'tripTotal', totals.spent + totals.estimated, 'plannedBudget', t.budget, 'isOverBudget', CASE WHEN t.budget IS NOT NULL AND totals.spent + totals.estimated > t.budget THEN TRUE ELSE FALSE END, 'overBudgetAmount', CASE WHEN t.budget IS NOT NULL AND totals.spent + totals.estimated > t.budget THEN totals.spent + totals.estimated - t.budget ELSE 0 END)
      ) AS itinerary FROM shared_trip t CROSS JOIN totals`, [shareToken]);
    return result.rows[0]?.itinerary;
  },
  async copySharedTrip(shareToken: string, newOwnerId: string) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const source = await client.query<{ id: string; name: string; description: string | null; start_date: string; end_date: string; cover_image: string | null; budget: string | null }>(`SELECT t.id, t.name, t.description, t.start_date, t.end_date, t.cover_image, t.budget FROM shared_trips st JOIN trips t ON t.id = st.trip_id WHERE st.share_token = $1 AND t.is_public = TRUE AND (st.expires_at IS NULL OR st.expires_at > NOW()) FOR SHARE`, [shareToken]);
      if (!source.rows[0]) { await client.query("ROLLBACK"); return undefined; }
      const original = source.rows[0];
      const copiedTrip = await client.query<{ id: string }>(`INSERT INTO trips (user_id, name, description, start_date, end_date, cover_image, budget, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE) RETURNING id`, [newOwnerId, `${original.name} (Copy)`, original.description, original.start_date, original.end_date, original.cover_image, original.budget]);
      const stops = await client.query<{ id: string; city_id: string; stop_order: number; arrival_date: string; departure_date: string; notes: string | null }>("SELECT id, city_id, stop_order, arrival_date, departure_date, notes FROM trip_stops WHERE trip_id = $1 ORDER BY stop_order", [original.id]);
      const stopIds = new Map<string, string>();
      for (const stop of stops.rows) {
        const inserted = await client.query<{ id: string }>("INSERT INTO trip_stops (trip_id, city_id, stop_order, arrival_date, departure_date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [copiedTrip.rows[0].id, stop.city_id, stop.stop_order, stop.arrival_date, stop.departure_date, stop.notes]);
        stopIds.set(stop.id, inserted.rows[0].id);
      }
      const activities = await client.query<{ trip_stop_id: string; activity_id: string; activity_date: string; start_time: string | null; end_time: string | null; custom_cost: string | null; status: string; sort_order: number; notes: string | null }>("SELECT trip_stop_id, activity_id, activity_date, start_time, end_time, custom_cost, status, sort_order, notes FROM trip_activities WHERE trip_id = $1 ORDER BY activity_date, sort_order", [original.id]);
      for (const activity of activities.rows) await client.query("INSERT INTO trip_activities (trip_id, trip_stop_id, activity_id, activity_date, start_time, end_time, custom_cost, status, sort_order, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [copiedTrip.rows[0].id, stopIds.get(activity.trip_stop_id), activity.activity_id, activity.activity_date, activity.start_time, activity.end_time, activity.custom_cost, activity.status, activity.sort_order, activity.notes]);
      await client.query("COMMIT");
      return copiedTrip.rows[0].id;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  },
};
