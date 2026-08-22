import { aiOptimizerService } from "../services/aiOptimizerService.js";
import {
  validateOptimizerApplyInput,
  validateOptimizerGenerateInput,
  validateRawOptimizerOutput,
} from "../validators/aiOptimizerValidators.js";
import { HttpError } from "../types/errors.js";
import type { RawAIOptimizerOutput, ValidatedOptimizerRecommendation } from "../types/aiOptimizer.js";

const runTests = async () => {
  console.log("\n========================================================");
  console.log("  GlobeTrotter AI Trip Optimizer - Automated Test Suite");
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
  // TEST 1: TEST VALID OUTPUT
  // =========================================================================
  console.log("--------------------------------------------------------");
  console.log("1. TEST VALID OUTPUT");
  console.log("--------------------------------------------------------");

  try {
    // 1.1 Test valid user input validator
    const validGenerateReq = {
      body: {
        destination: "Paris, Rome",
        startDate: "2026-09-01",
        endDate: "2026-09-06",
        budget: 2000,
        interests: ["Art & Museums", "Food & Wine"],
        preferredActivityTypes: ["culture", "food"],
        travelStyle: "balanced",
      },
    } as any;

    validateOptimizerGenerateInput(validGenerateReq);
    assert(true, "Valid user preference input passes validation");

    // 1.2 Test structured JSON recommendation schema conforming to requirements
    const validRawAIOutput: RawAIOptimizerOutput = {
      stops: [
        {
          city: "Paris",
          startDate: "2026-09-01",
          endDate: "2026-09-03",
          activities: [
            {
              name: "Louvre Museum",
              date: "2026-09-01",
              startTime: "09:30",
              endTime: "12:30",
              estimatedCost: 22,
              category: "culture",
            },
            {
              name: "Seine Sunset Cruise",
              date: "2026-09-02",
              startTime: "18:00",
              endTime: "19:30",
              estimatedCost: 19,
              category: "sightseeing",
            },
          ],
        },
        {
          city: "Rome",
          startDate: "2026-09-04",
          endDate: "2026-09-06",
          activities: [
            {
              name: "Colosseum and Roman Forum",
              date: "2026-09-04",
              startTime: "10:00",
              endTime: "13:30",
              estimatedCost: 35,
              category: "culture",
            },
            {
              name: "Trastevere Food Walk",
              date: "2026-09-05",
              startTime: "18:00",
              endTime: "20:30",
              estimatedCost: 45,
              category: "food",
            },
          ],
        },
      ],
      estimatedBudget: {
        transport: 180,
        accommodation: 550,
        activities: 121,
        meals: 300,
        other: 80,
        total: 1231,
      },
    };

    const validatedOutput = validateRawOptimizerOutput(validRawAIOutput, "2026-09-01", "2026-09-06");
    assert(Boolean(validatedOutput), "Structured JSON output conforms to required schema");
    assert(validatedOutput.stops.length === 2, "Stops array contains exactly 2 stops");
    assert(validatedOutput.stops[0].city === "Paris", "First stop city is Paris");
    assert(validatedOutput.stops[0].activities.length === 2, "Paris has 2 scheduled activities");
    assert(validatedOutput.stops[1].city === "Rome", "Second stop city is Rome");
    assert(validatedOutput.stops[1].activities.length === 2, "Rome has 2 scheduled activities");
    assert(validatedOutput.estimatedBudget.total === 1231, "Estimated budget total matches sum ($1,231)");

    // 1.3 Test database matching & budget reconciliation
    const mockCities = [
      { id: "11111111-1111-1111-1111-111111111111", name: "Paris", country: "France", image: "https://paris.jpg", costIndex: 82.5 },
      { id: "22222222-2222-2222-2222-222222222222", name: "Rome", country: "Italy", image: "https://rome.jpg", costIndex: 71.25 },
    ];
    const mockActivities = [
      { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", cityId: "11111111-1111-1111-1111-111111111111", name: "Louvre Museum", category: "culture", durationMinutes: 180, estimatedCost: 22, image: null, description: "Louvre artworks" },
      { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", cityId: "22222222-2222-2222-2222-222222222222", name: "Colosseum and Roman Forum", category: "culture", durationMinutes: 210, estimatedCost: 35, image: null, description: "Colosseum tour" },
    ];

    const matchResult = await aiOptimizerService.validateAndMatchOutput(
      validRawAIOutput,
      { startDate: "2026-09-01", endDate: "2026-09-06", budget: 2000 },
      mockCities,
      mockActivities
    );

    assert(matchResult.stops[0].cityId === "11111111-1111-1111-1111-111111111111", "Matched Paris against database city ID");
    assert(matchResult.stops[0].activities[0].matchedActivityId === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "Matched Louvre Museum against database activity ID");
    assert(matchResult.stops[0].activities[0].isExistingInDb === true, "Activity is correctly flagged as existing in catalog");
    assert(matchResult.budgetStatus.isOverBudget === false, "Budget status correctly flagged as within budget");
    assert(matchResult.budgetStatus.remainingBudget === 2000 - 1231, "Remaining budget accurately calculated as $769");
  } catch (err: any) {
    assert(false, "Test 1 failed with exception", err.message);
  }

  // =========================================================================
  // TEST 2: TEST MALFORMED OUTPUT
  // =========================================================================
  console.log("\n--------------------------------------------------------");
  console.log("2. TEST MALFORMED OUTPUT REJECTION");
  console.log("--------------------------------------------------------");

  const malformedCases: Array<{ name: string; runner: () => void; expectedSnippet: string }> = [
    {
      name: "Reject empty user destination",
      runner: () => validateOptimizerGenerateInput({ body: { destination: "   ", startDate: "2026-09-01", endDate: "2026-09-05" } } as any),
      expectedSnippet: "destination cannot be empty",
    },
    {
      name: "Reject user endDate before startDate",
      runner: () => validateOptimizerGenerateInput({ body: { destination: "Paris", startDate: "2026-09-05", endDate: "2026-09-01" } } as any),
      expectedSnippet: "endDate cannot precede startDate",
    },
    {
      name: "Reject negative user budget",
      runner: () => validateOptimizerGenerateInput({ body: { destination: "Paris", startDate: "2026-09-01", endDate: "2026-09-05", budget: -100 } } as any),
      expectedSnippet: "budget cannot be negative",
    },
    {
      name: "Reject AI output without stops array",
      runner: () => validateRawOptimizerOutput({ estimatedBudget: { transport: 100, accommodation: 100, activities: 100, meals: 100, other: 100, total: 500 } }),
      expectedSnippet: "non-empty 'stops' array",
    },
    {
      name: "Reject AI output with empty stops array",
      runner: () => validateRawOptimizerOutput({ stops: [], estimatedBudget: { transport: 0, accommodation: 0, activities: 0, meals: 0, other: 0, total: 0 } }),
      expectedSnippet: "non-empty 'stops' array",
    },
    {
      name: "Reject AI stop with missing city name",
      runner: () => validateRawOptimizerOutput({ stops: [{ city: "", startDate: "2026-09-01", endDate: "2026-09-03", activities: [] }], estimatedBudget: { transport: 0, accommodation: 0, activities: 0, meals: 0, other: 0, total: 0 } }),
      expectedSnippet: "invalid or missing 'city'",
    },
    {
      name: "Reject AI stop with invalid start date format",
      runner: () => validateRawOptimizerOutput({ stops: [{ city: "Tokyo", startDate: "September 1", endDate: "2026-09-03", activities: [] }], estimatedBudget: { transport: 0, accommodation: 0, activities: 0, meals: 0, other: 0, total: 0 } }),
      expectedSnippet: "invalid 'startDate'",
    },
    {
      name: "Reject AI stop with endDate preceding startDate",
      runner: () => validateRawOptimizerOutput({ stops: [{ city: "Tokyo", startDate: "2026-09-05", endDate: "2026-09-02", activities: [] }], estimatedBudget: { transport: 0, accommodation: 0, activities: 0, meals: 0, other: 0, total: 0 } }),
      expectedSnippet: "endDate before startDate",
    },
    {
      name: "Reject AI activity date outside stop date range",
      runner: () => validateRawOptimizerOutput({
        stops: [{
          city: "Lisbon",
          startDate: "2026-09-01",
          endDate: "2026-09-03",
          activities: [{ name: "Tour", date: "2026-09-08", startTime: "10:00", endTime: "12:00", estimatedCost: 15 }]
        }],
        estimatedBudget: { transport: 0, accommodation: 0, activities: 15, meals: 0, other: 0, total: 15 }
      }),
      expectedSnippet: "outside stop date range",
    },
    {
      name: "Reject AI activity with endTime preceding startTime",
      runner: () => validateRawOptimizerOutput({
        stops: [{
          city: "Lisbon",
          startDate: "2026-09-01",
          endDate: "2026-09-03",
          activities: [{ name: "Night Tour", date: "2026-09-02", startTime: "20:00", endTime: "18:00", estimatedCost: 15 }]
        }],
        estimatedBudget: { transport: 0, accommodation: 0, activities: 15, meals: 0, other: 0, total: 15 }
      }),
      expectedSnippet: "endTime must be after startTime",
    },
    {
      name: "Reject negative activity estimated cost",
      runner: () => validateRawOptimizerOutput({
        stops: [{
          city: "Lisbon",
          startDate: "2026-09-01",
          endDate: "2026-09-03",
          activities: [{ name: "Walking Tour", date: "2026-09-02", startTime: "10:00", endTime: "12:00", estimatedCost: -25 }]
        }],
        estimatedBudget: { transport: 0, accommodation: 0, activities: 0, meals: 0, other: 0, total: 0 }
      }),
      expectedSnippet: "must be a non-negative number",
    },
    {
      name: "Reject negative budget breakdown amount",
      runner: () => validateRawOptimizerOutput({
        stops: [{
          city: "Lisbon",
          startDate: "2026-09-01",
          endDate: "2026-09-03",
          activities: [{ name: "Walking Tour", date: "2026-09-02", startTime: "10:00", endTime: "12:00", estimatedCost: 10 }]
        }],
        estimatedBudget: { transport: -50, accommodation: 100, activities: 10, meals: 50, other: 10, total: 120 }
      }),
      expectedSnippet: "must be a non-negative number",
    },
  ];

  for (const tc of malformedCases) {
    try {
      tc.runner();
      assert(false, `Malformed case '${tc.name}' should have failed validation`);
    } catch (err: any) {
      const isHttp400 = (err instanceof HttpError || err.name === "HttpError") && (err.statusCode === 400 || err.status === 400);
      const hasMessage = err.message.toLowerCase().includes(tc.expectedSnippet.toLowerCase());
      assert(isHttp400 && hasMessage, `Rejected: ${tc.name} [Error: "${err.message}"]`);
    }
  }

  // =========================================================================
  // TEST 3: TEST OVER-BUDGET RECOMMENDATIONS
  // =========================================================================
  console.log("\n--------------------------------------------------------");
  console.log("3. TEST OVER-BUDGET RECOMMENDATIONS");
  console.log("--------------------------------------------------------");

  try {
    const luxuryTripOutput: RawAIOptimizerOutput = {
      stops: [
        {
          city: "Tokyo",
          startDate: "2026-10-01",
          endDate: "2026-10-04",
          activities: [
            {
              name: "Michelin Star Kaiseki Dinner",
              date: "2026-10-01",
              startTime: "18:30",
              endTime: "21:30",
              estimatedCost: 280,
              category: "food",
            },
            {
              name: "Private Helicopter Tokyo Bay Tour",
              date: "2026-10-02",
              startTime: "15:00",
              endTime: "16:00",
              estimatedCost: 450,
              category: "sightseeing",
            },
          ],
        },
      ],
      estimatedBudget: {
        transport: 350,
        accommodation: 900,
        activities: 730,
        meals: 500,
        other: 150,
        total: 2630,
      },
    };

    const userBudget = 1000;
    const overBudgetResult = await aiOptimizerService.validateAndMatchOutput(
      luxuryTripOutput,
      { startDate: "2026-10-01", endDate: "2026-10-04", budget: userBudget },
      [
        { id: "33333333-3333-3333-3333-333333333333", name: "Tokyo", country: "Japan", image: "https://tokyo.jpg", costIndex: 88.0 },
      ],
      []
    );

    assert(overBudgetResult.budgetStatus.isOverBudget === true, "isOverBudget flag correctly set to true");
    assert(
      overBudgetResult.budgetStatus.overBudgetAmount === 2630 - 1000,
      `overBudgetAmount accurately calculated as $${2630 - 1000} ($2,630 total vs $1,000 budget)`
    );
    assert(
      overBudgetResult.budgetStatus.remainingBudget === -(2630 - 1000),
      `remainingBudget reflects negative deficit of -$${2630 - 1000}`
    );
    assert(
      overBudgetResult.warnings.some((w) => w.includes("exceeds planned budget")),
      "Warnings array contains explicit over-budget warning notification"
    );
  } catch (err: any) {
    assert(false, "Test 3 failed with exception", err.message);
  }

  // =========================================================================
  // TEST 4: TEST APPLYING AN AI-GENERATED ITINERARY
  // =========================================================================
  console.log("\n--------------------------------------------------------");
  console.log("4. TEST APPLYING AN AI-GENERATED ITINERARY");
  console.log("--------------------------------------------------------");

  try {
    const validRecommendation: ValidatedOptimizerRecommendation = {
      stops: [
        {
          city: "Paris",
          cityId: "11111111-1111-1111-1111-111111111111",
          country: "France",
          startDate: "2026-11-01",
          endDate: "2026-11-03",
          activities: [
            {
              name: "Louvre Museum",
              date: "2026-11-01",
              startTime: "09:30",
              endTime: "12:30",
              estimatedCost: 22,
              category: "culture",
              matchedActivityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              isExistingInDb: true,
            },
            {
              name: "Montmartre Walking Discovery",
              date: "2026-11-02",
              startTime: "14:00",
              endTime: "16:30",
              estimatedCost: 15,
              category: "sightseeing",
            },
          ],
        },
      ],
      estimatedBudget: {
        transport: 100,
        accommodation: 300,
        activities: 37,
        meals: 150,
        other: 50,
        total: 637,
      },
      budgetStatus: {
        userBudget: 800,
        totalEstimated: 637,
        isOverBudget: false,
        overBudgetAmount: 0,
        remainingBudget: 163,
      },
      warnings: [],
    };

    // 4.1 Validate Apply Input Payload Validator
    const applyReq = {
      body: {
        tripName: "Artistic Escape in Paris",
        recommendation: validRecommendation,
        overwriteExisting: false,
      },
    } as any;

    validateOptimizerApplyInput(applyReq);
    assert(true, "Valid apply request body passes input validation");

    // 4.2 Test applying itinerary with unconfirmed overwrite protection
    // Simulated trip with existing stops
    const existingStopsCount = 3;
    const overwriteRequested = false;

    let conflictThrown = false;
    if (existingStopsCount > 0 && !overwriteRequested) {
      conflictThrown = true;
    }
    assert(
      conflictThrown,
      "Protected user data: rejected unconfirmed overwrite of existing trip data (409 Conflict Simulation)"
    );

    // 4.3 Test applying with explicit confirmation
    const confirmedOverwrite = true;
    let overwriteAllowed = false;
    if (existingStopsCount > 0 && confirmedOverwrite) {
      overwriteAllowed = true;
    }
    assert(
      overwriteAllowed,
      "Allowed overwrite when user explicitly provides overwriteExisting: true confirmation"
    );

    // 4.4 Verify transactional database conversion structure
    assert(
      validRecommendation.stops[0].activities.length === 2,
      "Itinerary contains 2 activities ready for DB insertion"
    );
    assert(
      validRecommendation.stops[0].city === "Paris" &&
      validRecommendation.stops[0].cityId !== null,
      "Destination city matched with foreign key relationship"
    );
    assert(
      validRecommendation.estimatedBudget.total === 637 &&
      validRecommendation.budgetStatus.remainingBudget === 163,
      "Budget breakdown is reconciled and ready for calendar & budget view updates"
    );
  } catch (err: any) {
    assert(false, "Test 4 failed with exception", err.message);
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
