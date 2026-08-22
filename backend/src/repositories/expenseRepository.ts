import { db } from "../config/db.js";
import type { ExpenseInput } from "../types/api.js";

const fields = "id, trip_id AS \"tripId\", trip_stop_id AS \"tripStopId\", category, description, amount, expense_date AS \"expenseDate\", created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

export const expenseRepository = {
  async create(tripId: string, input: ExpenseInput) {
    return (await db.query(`INSERT INTO expenses (trip_id, trip_stop_id, category, description, amount, expense_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${fields}`, [tripId, input.tripStopId ?? null, input.category, input.description ?? null, input.amount, input.expenseDate])).rows[0];
  },
  async findOwned(id: string, tripId: string, userId: string) {
    return (await db.query(`SELECT e.${fields.replaceAll(", ", ", e.")} FROM expenses e JOIN trips t ON t.id = e.trip_id WHERE e.id = $1 AND e.trip_id = $2 AND t.user_id = $3`, [id, tripId, userId])).rows[0];
  },
  async update(id: string, tripId: string, input: Partial<ExpenseInput>) {
    const columns: Record<string, string> = { tripStopId: "trip_stop_id", category: "category", description: "description", amount: "amount", expenseDate: "expense_date" };
    const entries = Object.entries(input).filter(([, value]) => value !== undefined); const values = entries.map(([, value]) => value);
    const setClause = entries.map(([key], index) => `${columns[key]} = $${index + 1}`).join(", ");
    return (await db.query(`UPDATE expenses SET ${setClause} WHERE id = $${values.length + 1} AND trip_id = $${values.length + 2} RETURNING ${fields}`, [...values, id, tripId])).rows[0];
  },
  async remove(id: string, tripId: string) { return (await db.query("DELETE FROM expenses WHERE id = $1 AND trip_id = $2 RETURNING id", [id, tripId])).rows[0]; },
  async summary(tripId: string) {
    return (await db.query(`SELECT COALESCE(SUM(amount), 0) AS \"totalSpent\", COALESCE(json_agg(json_build_object('category', category, 'total', total) ORDER BY category) FILTER (WHERE category IS NOT NULL), '[]') AS \"byCategory\" FROM (SELECT category, SUM(amount) AS total FROM expenses WHERE trip_id = $1 GROUP BY category) grouped`, [tripId])).rows[0];
  },
};
