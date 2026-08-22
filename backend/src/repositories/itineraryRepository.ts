import { db } from "../config/db.js";

export const itineraryRepository = {
  async findOwned(tripId: string, userId: string) {
    const result = await db.query<{ itinerary: unknown }>(`
      WITH owned_trip AS (
        SELECT id, name, description, start_date, end_date, budget, is_public
        FROM trips WHERE id = $1 AND user_id = $2
      ), dates AS (
        SELECT generate_series(start_date::timestamp, end_date::timestamp, interval '1 day')::DATE AS itinerary_date
        FROM owned_trip
      ), activity_days AS (
        SELECT
          ta.activity_date,
          COALESCE(SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)), 0) AS estimated_activity_cost,
          jsonb_agg(jsonb_build_object(
            'id', ta.id,
            'activityId', a.id,
            'name', a.name,
            'category', a.category,
            'startTime', ta.start_time,
            'endTime', ta.end_time,
            'durationMinutes', a.duration_minutes,
            'cost', COALESCE(ta.custom_cost, a.estimated_cost, 0),
            'notes', ta.notes,
            'status', ta.status,
            'sortOrder', ta.sort_order
          ) ORDER BY ta.sort_order, ta.start_time NULLS LAST) AS activities
        FROM trip_activities ta
        JOIN activities a ON a.id = ta.activity_id
        JOIN owned_trip t ON t.id = ta.trip_id
        WHERE ta.status <> 'cancelled'
        GROUP BY ta.activity_date
      ), expense_days AS (
        SELECT e.expense_date, COALESCE(SUM(e.amount), 0) AS actual_expense_cost
        FROM expenses e
        JOIN owned_trip t ON t.id = e.trip_id
        GROUP BY e.expense_date
      ), day_rows AS (
        SELECT
          d.itinerary_date,
          (
            SELECT jsonb_build_object(
              'id', c.id, 'name', c.name, 'country', c.country, 'countryCode', c.country_code,
              'region', c.region, 'image', c.image, 'latitude', c.latitude, 'longitude', c.longitude,
              'stopOrder', ts.stop_order
            )
            FROM trip_stops ts
            JOIN cities c ON c.id = ts.city_id
            JOIN owned_trip t ON t.id = ts.trip_id
            WHERE d.itinerary_date BETWEEN ts.arrival_date AND ts.departure_date
            ORDER BY ts.stop_order
            LIMIT 1
          ) AS city,
          COALESCE(ad.activities, '[]'::jsonb) AS activities,
          COALESCE(ed.actual_expense_cost, 0) AS actual_expense_cost,
          COALESCE(ad.estimated_activity_cost, 0) AS estimated_activity_cost
        FROM dates d
        LEFT JOIN activity_days ad ON ad.activity_date = d.itinerary_date
        LEFT JOIN expense_days ed ON ed.expense_date = d.itinerary_date
      ), totals AS (
        SELECT
          COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN owned_trip t ON t.id = e.trip_id), 0) AS total_spent,
          COALESCE((SELECT SUM(COALESCE(ta.custom_cost, a.estimated_cost, 0)) FROM trip_activities ta JOIN activities a ON a.id = ta.activity_id JOIN owned_trip t ON t.id = ta.trip_id WHERE ta.status <> 'cancelled'), 0) AS estimated_activity_cost
      )
      SELECT jsonb_build_object(
        'trip', jsonb_build_object(
          'id', t.id, 'name', t.name, 'description', t.description,
          'startDate', t.start_date, 'endDate', t.end_date,
          'plannedBudget', t.budget, 'isPublic', t.is_public
        ),
        'days', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'date', itinerary_date,
          'city', city,
          'activities', activities,
          'dailyCost', jsonb_build_object(
            'actualExpenses', actual_expense_cost,
            'estimatedActivities', estimated_activity_cost,
            'totalCommitted', actual_expense_cost + estimated_activity_cost
          )
        ) ORDER BY itinerary_date) FROM day_rows), '[]'::jsonb),
        'summary', jsonb_build_object(
          'tripDays', (t.end_date - t.start_date + 1),
          'totalSpent', totals.total_spent,
          'estimatedActivityCost', totals.estimated_activity_cost,
          'tripTotal', totals.total_spent + totals.estimated_activity_cost,
          'plannedBudget', t.budget,
          'remainingBudget', CASE WHEN t.budget IS NULL THEN NULL ELSE t.budget - (totals.total_spent + totals.estimated_activity_cost) END,
          'isOverBudget', CASE WHEN t.budget IS NOT NULL AND (totals.total_spent + totals.estimated_activity_cost) > t.budget THEN TRUE ELSE FALSE END,
          'overBudgetAmount', CASE WHEN t.budget IS NOT NULL AND (totals.total_spent + totals.estimated_activity_cost) > t.budget THEN (totals.total_spent + totals.estimated_activity_cost) - t.budget ELSE 0 END
        )
      ) AS itinerary
      FROM owned_trip t CROSS JOIN totals`, [tripId, userId]);
    return result.rows[0]?.itinerary;
  },
};
