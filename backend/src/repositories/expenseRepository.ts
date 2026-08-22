import { db } from "../config/db.js";
import type { ExpenseInput } from "../types/api.js";

const fields = "id, trip_id AS \"tripId\", trip_stop_id AS \"tripStopId\", category, description, amount, expense_date AS \"expenseDate\", created_at AS \"createdAt\", updated_at AS \"updatedAt\"";

export const expenseRepository = {
  async list(tripId: string, userId: string) {
    return (await db.query(`SELECT e.${fields.replaceAll(", ", ", e.")} FROM expenses e JOIN trips t ON t.id = e.trip_id WHERE e.trip_id = $1 AND t.user_id = $2 ORDER BY e.expense_date DESC, e.created_at DESC`, [tripId, userId])).rows;
  },
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
  async budgetSummary(tripId: string) {
    const result = await db.query(`
      WITH trip_data AS (
        SELECT id, budget, (end_date - start_date + 1)::NUMERIC AS trip_days
        FROM trips WHERE id = $1
      ), expense_totals AS (
        SELECT
          COALESCE(SUM(e.amount), 0) AS total_spent,
          COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'transport'), 0) AS transport_total,
          COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'accommodation'), 0) AS accommodation_total,
          COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'activity'), 0) AS activity_total,
          COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'meal'), 0) AS meal_total,
          COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'other'), 0) AS other_total
        FROM expenses e WHERE e.trip_id = $1
      ), activity_estimate AS (
        SELECT COALESCE(SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)), 0) AS estimated_activity_cost
        FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id
        WHERE ta.trip_id = $1 AND ta.status <> 'cancelled'
      ), daily_totals AS (
        SELECT expense_date, SUM(amount) AS total
        FROM expenses WHERE trip_id = $1 GROUP BY expense_date
      ), daily_summary AS (
        SELECT
          COALESCE(jsonb_agg(jsonb_build_object(
            'date', d.expense_date,
            'total', d.total,
            'percentageOfPlannedDailyBudget', CASE WHEN t.budget IS NULL OR t.budget = 0 THEN NULL ELSE ROUND((d.total * 100) / (t.budget / t.trip_days), 2) END,
            'isOverBudget', CASE WHEN t.budget IS NOT NULL AND d.total > (t.budget / t.trip_days) THEN TRUE ELSE FALSE END,
            'overBudgetAmount', CASE WHEN t.budget IS NOT NULL AND d.total > (t.budget / t.trip_days) THEN d.total - (t.budget / t.trip_days) ELSE 0 END
          ) ORDER BY d.expense_date) FILTER (WHERE d.expense_date IS NOT NULL), '[]'::jsonb) AS daily_expenses,
          COALESCE(jsonb_agg(jsonb_build_object(
            'date', d.expense_date,
            'total', d.total,
            'overBudgetAmount', d.total - (t.budget / t.trip_days)
          ) ORDER BY d.expense_date) FILTER (WHERE t.budget IS NOT NULL AND d.total > (t.budget / t.trip_days)), '[]'::jsonb) AS over_budget_days
        FROM trip_data t LEFT JOIN daily_totals d ON TRUE
        GROUP BY t.budget, t.trip_days
      )
      SELECT
        t.budget AS \"plannedBudget\",
        e.total_spent AS \"totalSpent\",
        CASE WHEN t.budget IS NULL THEN NULL ELSE t.budget - e.total_spent END AS \"remainingBudget\",
        CASE WHEN t.budget IS NULL OR t.budget = 0 THEN NULL ELSE ROUND((e.total_spent * 100) / t.budget, 2) END AS \"percentageUsed\",
        e.transport_total AS \"transportTotal\",
        e.accommodation_total AS \"accommodationTotal\",
        e.activity_total AS \"activityTotal\",
        e.meal_total AS \"mealTotal\",
        e.other_total AS \"otherTotal\",
        CASE WHEN t.trip_days = 0 THEN 0 ELSE ROUND(e.total_spent / t.trip_days, 2) END AS \"averageDailyCost\",
        a.estimated_activity_cost AS \"estimatedActivityCost\",
        (e.total_spent + a.estimated_activity_cost) AS \"totalEstimatedCost\",
        CASE WHEN t.budget IS NULL THEN NULL ELSE t.budget - (e.total_spent + a.estimated_activity_cost) END AS \"projectedRemainingBudget\",
        jsonb_build_object(
          'transport', CASE WHEN e.total_spent = 0 THEN 0 ELSE ROUND((e.transport_total * 100) / e.total_spent, 2) END,
          'accommodation', CASE WHEN e.total_spent = 0 THEN 0 ELSE ROUND((e.accommodation_total * 100) / e.total_spent, 2) END,
          'activity', CASE WHEN e.total_spent = 0 THEN 0 ELSE ROUND((e.activity_total * 100) / e.total_spent, 2) END,
          'meal', CASE WHEN e.total_spent = 0 THEN 0 ELSE ROUND((e.meal_total * 100) / e.total_spent, 2) END,
          'other', CASE WHEN e.total_spent = 0 THEN 0 ELSE ROUND((e.other_total * 100) / e.total_spent, 2) END
        ) AS \"categoryPercentages\",
        d.daily_expenses AS \"dailyExpenseBreakdown\",
        d.over_budget_days AS \"overBudgetDays\",
        CASE WHEN t.budget IS NOT NULL AND (e.total_spent + a.estimated_activity_cost) > t.budget THEN TRUE ELSE FALSE END AS \"isOverBudget\",
        CASE WHEN t.budget IS NOT NULL AND (e.total_spent + a.estimated_activity_cost) > t.budget THEN (e.total_spent + a.estimated_activity_cost) - t.budget ELSE 0 END AS \"overBudgetAmount\"
      FROM trip_data t CROSS JOIN expense_totals e CROSS JOIN activity_estimate a CROSS JOIN daily_summary d`, [tripId]);
    return result.rows[0];
  },
};
