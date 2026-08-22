import { db } from "../config/db.js";
import type { TripInput } from "../types/api.js";

const tripFields = "t.id, t.user_id AS \"userId\", t.name, t.description, t.start_date AS \"startDate\", t.end_date AS \"endDate\", t.cover_image AS \"coverImage\", t.budget, t.is_public AS \"isPublic\", t.created_at AS \"createdAt\", t.updated_at AS \"updatedAt\"";
const tripSummaryFields = `${tripFields}, jsonb_build_object('startDate', t.start_date, 'endDate', t.end_date) AS \"dateRange\",
  (SELECT COUNT(*)::INTEGER FROM trip_stops ts WHERE ts.trip_id = t.id) AS \"destinationCount\",
  COALESCE((SELECT SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)) FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id WHERE ta.trip_id = t.id AND ta.status <> 'cancelled'), 0) AS \"estimatedExpenseTotal\"`;

export const tripRepository = {
  async create(userId: string, input: TripInput) {
    const result = await db.query(`INSERT INTO trips (user_id, name, description, start_date, end_date, cover_image, budget, is_public)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [userId, input.name, input.description ?? null, input.startDate, input.endDate, input.coverImage ?? null, input.budget ?? null, input.isPublic ?? false]);
    return result.rows[0];
  },
  async listByUser(userId: string) {
    return (await db.query(`SELECT ${tripSummaryFields} FROM trips t WHERE t.user_id = $1 ORDER BY t.start_date DESC, t.created_at DESC`, [userId])).rows;
  },
  async findOwned(id: string, userId: string) {
    return (await db.query(`SELECT ${tripSummaryFields} FROM trips t WHERE t.id = $1 AND t.user_id = $2`, [id, userId])).rows[0];
  },
  async update(id: string, userId: string, input: Partial<TripInput>) {
    const columns: Record<string, string> = { name: "name", description: "description", startDate: "start_date", endDate: "end_date", coverImage: "cover_image", budget: "budget", isPublic: "is_public" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    return (await db.query(`UPDATE trips SET ${setClause} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING id`, [...values, id, userId])).rows[0];
  },
  async remove(id: string, userId: string) {
    return (await db.query("DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId])).rows[0];
  },
  async dashboard(userId: string) {
    const result = await db.query(`
      WITH trip_summaries AS (
        SELECT ${tripSummaryFields}
        FROM trips t
        WHERE t.user_id = $1
      )
      SELECT
        COUNT(*)::INTEGER AS \"tripCount\",
        jsonb_build_object(
          'plannedBudget', COALESCE(SUM(budget), 0),
          'estimatedExpenseTotal', COALESCE(SUM(\"estimatedExpenseTotal\"), 0),
          'actualExpenseTotal', COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN trips et ON et.id = e.trip_id WHERE et.user_id = $1), 0)
        ) AS \"budgetHighlights\",
        COALESCE((SELECT jsonb_agg(upcoming ORDER BY upcoming.\"startDate\") FROM (SELECT * FROM trip_summaries WHERE \"startDate\" >= CURRENT_DATE ORDER BY \"startDate\" LIMIT 5) upcoming), '[]'::jsonb) AS \"upcomingTrips\",
        COALESCE((SELECT jsonb_agg(recent ORDER BY recent.\"updatedAt\" DESC) FROM (SELECT * FROM trip_summaries ORDER BY \"updatedAt\" DESC LIMIT 5) recent), '[]'::jsonb) AS \"recentTrips\"
      FROM trip_summaries`, [userId]);
    return result.rows[0];
  },
};
