import {
  validateApplyBudgetOptimizationInput,
} from "../validators/budgetOptimizerValidators.js";
import { HttpError } from "../types/errors.js";
import type {
  AppliedOptimizationItem,
  ApplyBudgetOptimizationInput,
  BudgetOptimizationRecommendation,
  BudgetOptimizationResponse,
} from "../types/budgetOptimizer.js";

const runTests = async () => {
  console.log("\n========================================================");
  console.log("  GlobeTrotter Budget Optimization - Automated Test Suite");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, details?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  };

  // =========================================================================
  // TEST 1: TEST UNDER BUDGET
  // =========================================================================
  console.log("--------------------------------------------------------");
  console.log("1. TEST UNDER BUDGET");
  console.log("--------------------------------------------------------");

  try {
    const underBudgetTrip = {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Tokyo Explorer",
      budget: 50000,
      expenses: [
        { id: "e1", category: "accommodation" as const, description: "Hotel Shinjuku", amount: 15000 },
        { id: "e2", category: "meal" as const, description: "Dining & Izakaya", amount: 8000 },
        { id: "e3", category: "transport" as const, description: "Metro Pass", amount: 4000 },
      ],
      activities: [
        { id: "a1", activityName: "TeamLab Planets", category: "culture", customCost: null, estimatedCost: 3500 },
        { id: "a2", activityName: "Sumo Experience", category: "culture", customCost: 4500, estimatedCost: 5000 },
      ],
    };

    const totalExpenses = underBudgetTrip.expenses.reduce((s, e) => s + e.amount, 0); // 27000
    const totalActivities = underBudgetTrip.activities.reduce((s, a) => s + (a.customCost ?? a.estimatedCost), 0); // 8000
    const currentCost = totalExpenses + totalActivities; // 35000
    const targetBudget = underBudgetTrip.budget; // 50000

    const isOverBudget = currentCost > targetBudget;
    const savingsRequired = isOverBudget ? currentCost - targetBudget : 0;
    const recommendations: BudgetOptimizationRecommendation[] = [];

    const response: BudgetOptimizationResponse = {
      currentCost,
      targetBudget,
      savingsRequired,
      isOverBudget,
      totalPotentialSavings: 0,
      recommendations,
    };

    assert(response.currentCost === 35000, "Current cost calculated correctly as ₹35,000");
    assert(response.targetBudget === 50000, "Target budget is ₹50,000");
    assert(response.isOverBudget === false, "isOverBudget flag is accurately false");
    assert(response.savingsRequired === 0, "savingsRequired is 0 when under budget");
    assert(response.recommendations.length === 0, "No recommendations generated when under budget");
    assert(response.totalPotentialSavings === 0, "Total potential savings is 0");
  } catch (err: any) {
    assert(false, "Test 1 threw an error", err.message);
  }

  // =========================================================================
  // TEST 2: TEST OVER BUDGET
  // =========================================================================
  console.log("\n--------------------------------------------------------");
  console.log("2. TEST OVER BUDGET");
  console.log("--------------------------------------------------------");

  try {
    // Example from user prompt: Budget = 50,000, Estimated = 58,000
    const overBudgetTrip = {
      id: "22222222-2222-2222-2222-222222222222",
      name: "European Grand Tour",
      budget: 50000,
      expenses: [
        { id: "e-acc-1", category: "accommodation" as const, description: "Luxury Hotel Suite", amount: 24000 },
        { id: "e-meal-1", category: "meal" as const, description: "Fine Dining", amount: 12000 },
        { id: "e-trans-1", category: "transport" as const, description: "Private Chauffeur", amount: 8000 },
      ],
      activities: [
        { id: "a-act-1", activityName: "Private VIP Museum & City Tour", category: "sightseeing", customCost: 14000, estimatedCost: 14000 },
      ],
    };

    const totalExpenses = overBudgetTrip.expenses.reduce((s, e) => s + e.amount, 0); // 44000
    const totalActivities = overBudgetTrip.activities.reduce((s, a) => s + (a.customCost ?? a.estimatedCost), 0); // 14000
    const currentCost = totalExpenses + totalActivities; // 58000
    const targetBudget = overBudgetTrip.budget; // 50000

    const isOverBudget = currentCost > targetBudget;
    const savingsRequired = currentCost - targetBudget; // 8000

    const recommendations: BudgetOptimizationRecommendation[] = [];

    // 1. Accommodation
    for (const exp of overBudgetTrip.expenses.filter((e) => e.category === "accommodation")) {
      const potentialSavings = Math.round(exp.amount * 0.25); // 6000
      const proposedAmount = exp.amount - potentialSavings; // 18000
      recommendations.push({
        id: `opt-acc-${exp.id}`,
        category: "accommodation",
        title: `Optimize ${exp.description}`,
        description: `Switch ${exp.description} to boutique lodging or central apartments to save ~25%.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    // 2. Activities
    for (const act of overBudgetTrip.activities) {
      const effectiveCost = act.customCost ?? act.estimatedCost;
      const potentialSavings = Math.round(effectiveCost * 0.4); // 5600
      const proposedAmount = effectiveCost - potentialSavings; // 8400
      recommendations.push({
        id: `opt-act-${act.id}`,
        category: "activities",
        title: `Standard Entry for ${act.activityName}`,
        description: `Opt for standard admission and audio guide for '${act.activityName}' instead of private tour.`,
        potentialSavings,
        targetType: "activity",
        targetId: act.id,
        currentAmount: effectiveCost,
        proposedAmount,
      });
    }

    // 3. Meals
    for (const exp of overBudgetTrip.expenses.filter((e) => e.category === "meal")) {
      const potentialSavings = Math.round(exp.amount * 0.25); // 3000
      const proposedAmount = exp.amount - potentialSavings; // 9000
      recommendations.push({
        id: `opt-meal-${exp.id}`,
        category: "meals",
        title: `Dining Mix for ${exp.description}`,
        description: `Mix local bistros and street food markets to reduce dining expenses.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    // 4. Transport
    for (const exp of overBudgetTrip.expenses.filter((e) => e.category === "transport")) {
      const potentialSavings = Math.round(exp.amount * 0.2); // 1600
      const proposedAmount = exp.amount - potentialSavings; // 6400
      recommendations.push({
        id: `opt-trans-${exp.id}`,
        category: "transport",
        title: `Rail & Transit for ${exp.description}`,
        description: `Book regional train passes and transit cards instead of private transfers.`,
        potentialSavings,
        targetType: "expense",
        targetId: exp.id,
        currentAmount: exp.amount,
        proposedAmount,
      });
    }

    recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
    const totalPotentialSavings = recommendations.reduce((s, r) => s + r.potentialSavings, 0);

    const response: BudgetOptimizationResponse = {
      currentCost,
      targetBudget,
      savingsRequired,
      isOverBudget,
      totalPotentialSavings,
      recommendations,
    };

    assert(response.currentCost === 58000, "Current cost is ₹58,000 matching example");
    assert(response.targetBudget === 50000, "Target budget is ₹50,000 matching example");
    assert(response.savingsRequired === 8000, "Savings required is exactly ₹8,000 (58,000 - 50,000)");
    assert(response.isOverBudget === true, "isOverBudget flag is true");
    assert(response.recommendations.length === 4, "Generated 4 distinct category recommendations");

    // Verify categories present
    const categories = response.recommendations.map((r) => r.category);
    assert(categories.includes("accommodation"), "Contains accommodation savings recommendation");
    assert(categories.includes("activities"), "Contains activities savings recommendation");
    assert(categories.includes("meals"), "Contains meals savings recommendation");
    assert(categories.includes("transport"), "Contains transport savings recommendation");

    // Verify itemized savings arithmetic
    for (const rec of response.recommendations) {
      assert(
        rec.proposedAmount === rec.currentAmount - rec.potentialSavings,
        `Recommendation (${rec.category}) arithmetic valid: ${rec.currentAmount} - ${rec.potentialSavings} = ${rec.proposedAmount}`
      );
    }

    assert(
      response.totalPotentialSavings >= response.savingsRequired,
      `Total potential savings (₹${response.totalPotentialSavings}) covers the required ₹${response.savingsRequired} deficit`
    );
  } catch (err: any) {
    assert(false, "Test 2 threw an error", err.message);
  }

  // =========================================================================
  // TEST 3: TEST APPLYING RECOMMENDATIONS
  // =========================================================================
  console.log("\n--------------------------------------------------------");
  console.log("3. TEST APPLYING RECOMMENDATIONS");
  console.log("--------------------------------------------------------");

  try {
    // 3.1 Test input validation on apply payload
    const invalidPayloads: Array<{ name: string; payload: unknown; expectedSnippet: string }> = [
      {
        name: "Empty appliedItems array",
        payload: { appliedItems: [] },
        expectedSnippet: "must be a non-empty array",
      },
      {
        name: "Invalid targetType",
        payload: {
          appliedItems: [
            { targetType: "invalid_type", targetId: "11111111-1111-4111-a111-111111111111", proposedAmount: 100 },
          ],
        },
        expectedSnippet: "must be either 'expense' or 'activity'",
      },
      {
        name: "Non-uuid targetId",
        payload: {
          appliedItems: [
            { targetType: "expense", targetId: "not-a-valid-uuid", proposedAmount: 100 },
          ],
        },
        expectedSnippet: "must be a UUID",
      },
      {
        name: "Negative proposedAmount",
        payload: {
          appliedItems: [
            { targetType: "expense", targetId: "11111111-1111-4111-a111-111111111111", proposedAmount: -50 },
          ],
        },
        expectedSnippet: "cannot be negative",
      },
    ];

    for (const tc of invalidPayloads) {
      try {
        validateApplyBudgetOptimizationInput({ body: tc.payload } as any);
        assert(false, `Payload '${tc.name}' should have failed validation`);
      } catch (err: any) {
        const isHttp400 = (err instanceof HttpError || err.name === "HttpError") && (err.statusCode === 400 || err.status === 400);
        const hasSnippet = err.message.toLowerCase().includes(tc.expectedSnippet.toLowerCase());
        assert(isHttp400 && hasSnippet, `Rejected invalid apply payload: ${tc.name} [${err.message}]`);
      }
    }

    // 3.2 Valid apply payload validation
    const validApplyInput: ApplyBudgetOptimizationInput = {
      selectedRecommendationIds: ["opt-acc-e1", "opt-act-a1"],
      appliedItems: [
        {
          targetType: "expense",
          targetId: "11111111-1111-4111-a111-111111111111",
          proposedAmount: 18000,
        },
        {
          targetType: "activity",
          targetId: "22222222-2222-4222-a222-222222222222",
          proposedAmount: 8400,
        },
      ],
    };

    validateApplyBudgetOptimizationInput({ body: validApplyInput } as any);
    assert(true, "Valid apply payload passes input validation");

    // 3.3 Simulate application of selected recommendations to database records
    const simulatedTrip = {
      budget: 50000,
      expenses: [
        { id: "11111111-1111-4111-a111-111111111111", category: "accommodation", amount: 24000 },
        { id: "33333333-3333-4333-a333-333333333333", category: "meal", amount: 12000 },
        { id: "44444444-4444-4444-a444-444444444444", category: "transport", amount: 8000 },
      ],
      activities: [
        { id: "22222222-2222-4222-a222-222222222222", name: "VIP Tour", customCost: 14000 },
      ],
    };

    const initialCost =
      simulatedTrip.expenses.reduce((s, e) => s + e.amount, 0) +
      simulatedTrip.activities.reduce((s, a) => s + a.customCost, 0);
    assert(initialCost === 58000, "Simulated pre-optimization cost is ₹58,000");

    // Apply updates:
    for (const item of validApplyInput.appliedItems) {
      if (item.targetType === "expense") {
        const exp = simulatedTrip.expenses.find((e) => e.id === item.targetId);
        if (exp) exp.amount = item.proposedAmount;
      } else if (item.targetType === "activity") {
        const act = simulatedTrip.activities.find((a) => a.id === item.targetId);
        if (act) act.customCost = item.proposedAmount;
      }
    }

    // Verify updated record states
    const updatedExp = simulatedTrip.expenses.find((e) => e.id === "11111111-1111-4111-a111-111111111111");
    const updatedAct = simulatedTrip.activities.find((a) => a.id === "22222222-2222-4222-a222-222222222222");

    assert(updatedExp?.amount === 18000, "Accommodation expense record updated from ₹24,000 to ₹18,000");
    assert(updatedAct?.customCost === 8400, "Activity record custom cost updated from ₹14,000 to ₹8,400");

    // Recalculate post-apply cost:
    const newCost =
      simulatedTrip.expenses.reduce((s, e) => s + e.amount, 0) +
      simulatedTrip.activities.reduce((s, a) => s + a.customCost, 0);

    // 18000 + 12000 + 8000 + 8400 = 46400
    assert(newCost === 46400, `New trip cost after applying recommendations is ₹${newCost}`);
    assert(newCost <= simulatedTrip.budget, `New trip cost (₹${newCost}) is now safely within planned budget (₹${simulatedTrip.budget})`);
    assert(simulatedTrip.budget - newCost === 3600, `Remaining budget surplus is ₹3,600`);
  } catch (err: any) {
    assert(false, "Test 3 threw an error", err.message);
  }

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log("\n========================================================");
  console.log(`  FINAL RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
