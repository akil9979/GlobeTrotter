import { db } from "../config/db.js";
import { HttpError } from "../types/errors.js";
import type {
  ApplyBudgetOptimizationInput,
  BudgetOptimizationRecommendation,
  BudgetOptimizationResponse,
} from "../types/budgetOptimizer.js";
import { expenseService } from "./expenseService.js";

type TripRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number | null;
};

type ExpenseRow = {
  id: string;
  category: "transport" | "accommodation" | "activity" | "meal" | "other";
  description: string | null;
  amount: number;
  expenseDate: string;
};

type ScheduledActivityRow = {
  id: string;
  activityId: string;
  activityName: string;
  category: string;
  customCost: number | null;
  estimatedCost: number | null;
  activityDate: string;
};

export const budgetOptimizerService = {
  async analyze(userId: string, tripId: string): Promise<BudgetOptimizationResponse> {
    // 1. Verify trip and ownership
    const tripResult = await db.query<TripRow>(
      `SELECT id, name, start_date AS "startDate", end_date AS "endDate", budget FROM trips WHERE id = $1 AND user_id = $2`,
      [tripId, userId]
    );
    const trip = tripResult.rows[0];
    if (!trip) throw new HttpError("Trip not found.", 404);

    // 2. Fetch all itemized expenses
    const expensesResult = await db.query<ExpenseRow>(
      `SELECT id, category, description, amount, expense_date AS "expenseDate"
       FROM expenses
       WHERE trip_id = $1
       ORDER BY amount DESC`,
      [tripId]
    );
    const expenses = expensesResult.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
    }));

    // 3. Fetch all scheduled activities
    const activitiesResult = await db.query<ScheduledActivityRow>(
      `SELECT ta.id, ta.activity_id AS "activityId", ta.activity_date AS "activityDate",
              ta.custom_cost AS "customCost", a.name AS "activityName", a.category,
              a.estimated_cost AS "estimatedCost"
       FROM trip_activities ta
       JOIN activities a ON a.id = ta.activity_id
       WHERE ta.trip_id = $1 AND ta.status <> 'cancelled'
       ORDER BY COALESCE(ta.custom_cost, a.estimated_cost, 0) DESC`,
      [tripId]
    );
    const activities = activitiesResult.rows.map((row) => ({
      ...row,
      customCost: row.customCost !== null ? Number(row.customCost) : null,
      estimatedCost: row.estimatedCost !== null ? Number(row.estimatedCost) : 0,
    }));

    // 4. Calculate total costs
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalActivities = activities.reduce(
      (sum, a) => sum + (a.customCost !== null ? a.customCost : a.estimatedCost),
      0
    );
    const currentCost = totalExpenses + totalActivities;
    const targetBudget = trip.budget !== null ? Number(trip.budget) : null;

    // 5. If under budget or no target budget set
    if (targetBudget === null || currentCost <= targetBudget) {
      return {
        currentCost,
        targetBudget,
        savingsRequired: 0,
        isOverBudget: false,
        totalPotentialSavings: 0,
        recommendations: [],
      };
    }

    // 6. Over budget: generate data-driven recommendations
    const savingsRequired = currentCost - targetBudget;
    const recommendations: BudgetOptimizationRecommendation[] = [];

    // Category 1: Accommodation optimizations
    const accommodationExpenses = expenses.filter((e) => e.category === "accommodation" && e.amount > 0);
    for (const exp of accommodationExpenses) {
      const savingsRatio = exp.amount >= 500 ? 0.25 : 0.2;
      const potentialSavings = Math.max(1, Math.round(exp.amount * savingsRatio));
      const proposedAmount = Math.max(0, exp.amount - potentialSavings);

      recommendations.push({
        id: `opt-acc-${exp.id}`,
        category: "accommodation",
        title: `Optimize ${exp.description || "Lodging Booking"}`,
        description: `Switch ${exp.description || "lodging"} to boutique stays, guesthouses, or alternative central districts to reduce cost by ~${Math.round(savingsRatio * 100)}%.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    // Category 2: Activities optimizations
    for (const act of activities) {
      const effectiveCost = act.customCost !== null ? act.customCost : act.estimatedCost;
      if (effectiveCost > 0) {
        const savingsRatio = effectiveCost >= 30 ? 0.4 : 0.3;
        const potentialSavings = Math.max(1, Math.round(effectiveCost * savingsRatio));
        const proposedAmount = Math.max(0, effectiveCost - potentialSavings);

        recommendations.push({
          id: `opt-act-${act.id}`,
          category: "activities",
          title: `Standard Admission for ${act.activityName}`,
          description: `Opt for general admission, student/city passes, or off-peak hours for '${act.activityName}' instead of premium guided rate.`,
          potentialSavings,
          targetType: "activity",
          targetId: act.id,
          currentAmount: effectiveCost,
          proposedAmount,
        });
      }
    }

    // Category 3: Meals optimizations
    const mealExpenses = expenses.filter((e) => e.category === "meal" && e.amount > 0);
    for (const exp of mealExpenses) {
      const potentialSavings = Math.max(1, Math.round(exp.amount * 0.25));
      const proposedAmount = Math.max(0, exp.amount - potentialSavings);

      recommendations.push({
        id: `opt-meal-${exp.id}`,
        category: "meals",
        title: `Balance Dining for ${exp.description || "Daily Meals"}`,
        description: `Mix casual bistros and local markets for '${exp.description || "Meals"}' to reduce average dining cost by ~25%.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    // Category 4: Transport optimizations
    const transportExpenses = expenses.filter((e) => e.category === "transport" && e.amount > 0);
    for (const exp of transportExpenses) {
      const potentialSavings = Math.max(1, Math.round(exp.amount * 0.2));
      const proposedAmount = Math.max(0, exp.amount - potentialSavings);

      recommendations.push({
        id: `opt-trans-${exp.id}`,
        category: "transport",
        title: `Transit Pass for ${exp.description || "Transportation"}`,
        description: `Book regional rail passes, public transit travelcards, or advance transfers for '${exp.description || "Transport"}'.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    // Sort recommendations by highest potential savings
    recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);

    const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);

    return {
      currentCost,
      targetBudget,
      savingsRequired,
      isOverBudget: true,
      totalPotentialSavings,
      recommendations,
    };
  },

  async apply(userId: string, tripId: string, input: ApplyBudgetOptimizationInput) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Verify trip ownership
      const tripCheck = await client.query(
        `SELECT id FROM trips WHERE id = $1 AND user_id = $2`,
        [tripId, userId]
      );
      if (!tripCheck.rows.length) {
        throw new HttpError("Trip not found.", 404);
      }

      let appliedCount = 0;

      for (const item of input.appliedItems) {
        if (item.targetType === "expense") {
          const updateRes = await client.query(
            `UPDATE expenses SET amount = $1, updated_at = NOW() WHERE id = $2 AND trip_id = $3 RETURNING id`,
            [item.proposedAmount, item.targetId, tripId]
          );
          if (updateRes.rows.length > 0) appliedCount++;
        } else if (item.targetType === "activity") {
          const updateRes = await client.query(
            `UPDATE trip_activities SET custom_cost = $1, updated_at = NOW() WHERE id = $2 AND trip_id = $3 RETURNING id`,
            [item.proposedAmount, item.targetId, tripId]
          );
          if (updateRes.rows.length > 0) appliedCount++;
        }
      }

      await client.query("COMMIT");

      const budgetSummary = await expenseService.budgetSummary(userId, tripId);

      return {
        appliedCount,
        budgetSummary,
        message: `Successfully applied ${appliedCount} budget optimization(s).`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
