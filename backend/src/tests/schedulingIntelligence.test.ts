import {
  schedulingIntelligenceService,
  timeToMinutes,
  minutesToTime,
} from "../services/schedulingIntelligenceService.js";
import {
  validateResolveSchedulingIssueInput,
} from "../validators/schedulingIntelligenceValidators.js";
import { HttpError } from "../types/errors.js";

const runTests = async () => {
  console.log("\n============================================================");
  console.log("  GlobeTrotter Scheduling Intelligence - Automated Test Suite");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition: unknown, testName: string, details?: string) => {
    if (Boolean(condition)) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  };

  // Helper trip and stop base fixtures
  const tripFixture = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "European Cultural Odyssey",
    startDate: "2026-09-01",
    endDate: "2026-09-10",
  };

  const stopsFixture = [
    {
      id: "stop-paris",
      cityId: "city-paris",
      cityName: "Paris",
      country: "France",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-05",
      stopOrder: 1,
    },
    {
      id: "stop-rome",
      cityId: "city-rome",
      cityName: "Rome",
      country: "Italy",
      arrivalDate: "2026-09-06",
      departureDate: "2026-09-10",
      stopOrder: 2,
    },
  ];

  // =========================================================================
  // TEST 1: DETECT OVERLAPPING ACTIVITIES (OVERLAP)
  // =========================================================================
  console.log("------------------------------------------------------------");
  console.log("1. DETECT OVERLAPPING ACTIVITIES (OVERLAP)");
  console.log("------------------------------------------------------------");

  try {
    const overlappingActs = [
      {
        id: "act-1",
        tripStopId: "stop-paris",
        activityId: "catalog-louvre",
        activityName: "Louvre Museum",
        category: "culture",
        durationMinutes: 180,
        customCost: null,
        estimatedCost: 22,
        activityDate: "2026-09-02",
        startTime: "09:30",
        endTime: "12:30",
        status: "confirmed",
        cityName: "Paris",
      },
      {
        id: "act-2",
        tripStopId: "stop-paris",
        activityId: "catalog-eiffel",
        activityName: "Eiffel Tower Summit",
        category: "sightseeing",
        durationMinutes: 120,
        customCost: null,
        estimatedCost: 28,
        activityDate: "2026-09-02",
        startTime: "11:00",
        endTime: "13:00",
        status: "confirmed",
        cityName: "Paris",
      },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      overlappingActs
    );

    assert(result.hasIssues === true, "Detected schedule conflict on overlapping activities");
    const overlapIssue = result.issues.find((i) => i.type === "OVERLAP");
    assert(Boolean(overlapIssue), "Identified issue with type 'OVERLAP'");
    assert(overlapIssue?.severity === "warning", "Overlap severity is set to 'warning'");
    assert(
      overlapIssue?.message.includes("Louvre Museum") && overlapIssue?.message.includes("Eiffel Tower Summit"),
      "Message mentions both overlapping activities"
    );
    assert(
      overlapIssue?.suggestion?.includes("12:30"),
      "Suggested start time begins after the first activity finishes (12:30)"
    );
    assert(
      overlapIssue?.resolutionAction?.type === "UPDATE_ACTIVITY_TIME" &&
      overlapIssue?.resolutionAction?.startTime === "12:30",
      "Resolution action proposes non-conflicting startTime (12:30)"
    );
  } catch (err: any) {
    assert(false, "Test 1 failed", err.message);
  }

  // =========================================================================
  // TEST 2: DETECT INVALID ACTIVITY TIMES (INVALID_TIME)
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("2. DETECT INVALID ACTIVITY TIMES (INVALID_TIME)");
  console.log("------------------------------------------------------------");

  try {
    const invalidTimeActs = [
      {
        id: "act-invalid-1",
        tripStopId: "stop-paris",
        activityId: "catalog-cruise",
        activityName: "Seine River Cruise",
        category: "sightseeing",
        durationMinutes: 90,
        customCost: null,
        estimatedCost: 20,
        activityDate: "2026-09-03",
        startTime: "16:00",
        endTime: "14:00", // Invalid: end time before start time
        status: "confirmed",
        cityName: "Paris",
      },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      invalidTimeActs
    );

    assert(result.hasIssues === true, "Detected invalid activity times");
    const invalidTimeIssue = result.issues.find((i) => i.type === "INVALID_TIME");
    assert(Boolean(invalidTimeIssue), "Identified issue with type 'INVALID_TIME'");
    assert(invalidTimeIssue?.severity === "error", "Invalid time severity is 'error'");
    assert(
      invalidTimeIssue?.message.includes("end time (14:00) must be after start time (16:00)"),
      "Message explains end time cannot precede start time"
    );
    assert(
      invalidTimeIssue?.resolutionAction?.startTime === "16:00" &&
      invalidTimeIssue?.resolutionAction?.endTime === "17:30",
      "Resolution action adjusted end time to 17:30 based on 90-minute duration"
    );
  } catch (err: any) {
    assert(false, "Test 2 failed", err.message);
  }

  // =========================================================================
  // TEST 3: DETECT ACTIVITY OUTSIDE STOP DATES (OUTSIDE_STOP_DATES)
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("3. DETECT ACTIVITY OUTSIDE STOP DATES (OUTSIDE_STOP_DATES)");
  console.log("------------------------------------------------------------");

  try {
    const outsideStopActs = [
      {
        id: "act-outside-stop",
        tripStopId: "stop-paris", // Paris is 2026-09-01 to 2026-09-05
        activityId: "catalog-monet",
        activityName: "Monet Orangerie Museum",
        category: "culture",
        durationMinutes: 120,
        customCost: null,
        estimatedCost: 18,
        activityDate: "2026-09-08", // Outside Paris stop dates
        startTime: "10:00",
        endTime: "12:00",
        status: "confirmed",
        cityName: "Paris",
      },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      outsideStopActs
    );

    assert(result.hasIssues === true, "Detected activity outside stop date boundaries");
    const outsideStopIssue = result.issues.find((i) => i.type === "OUTSIDE_STOP_DATES");
    assert(Boolean(outsideStopIssue), "Identified issue with type 'OUTSIDE_STOP_DATES'");
    assert(outsideStopIssue?.severity === "error", "Outside stop dates severity is 'error'");
    assert(
      outsideStopIssue?.message.includes("Paris stop is from 2026-09-01 to 2026-09-05"),
      "Message explains valid stop date boundaries"
    );
    assert(
      outsideStopIssue?.resolutionAction?.date === "2026-09-05",
      "Resolution action proposes moving activity to nearest valid stop date (2026-09-05)"
    );
  } catch (err: any) {
    assert(false, "Test 3 failed", err.message);
  }

  // =========================================================================
  // TEST 4: DETECT ACTIVITY OUTSIDE TRIP DATES (OUTSIDE_TRIP_DATES)
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("4. DETECT ACTIVITY OUTSIDE TRIP DATES (OUTSIDE_TRIP_DATES)");
  console.log("------------------------------------------------------------");

  try {
    const outsideTripActs = [
      {
        id: "act-outside-trip",
        tripStopId: "stop-rome",
        activityId: "catalog-vatican",
        activityName: "Vatican Museums",
        category: "culture",
        durationMinutes: 180,
        customCost: null,
        estimatedCost: 30,
        activityDate: "2026-09-15", // Trip ends 2026-09-10
        startTime: "09:00",
        endTime: "12:00",
        status: "confirmed",
        cityName: "Rome",
      },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      outsideTripActs
    );

    assert(result.hasIssues === true, "Detected activity outside trip date boundaries");
    const outsideTripIssue = result.issues.find((i) => i.type === "OUTSIDE_TRIP_DATES");
    assert(Boolean(outsideTripIssue), "Identified issue with type 'OUTSIDE_TRIP_DATES'");
    assert(outsideTripIssue?.severity === "error", "Outside trip dates severity is 'error'");
    assert(
      outsideTripIssue?.message.includes("outside trip dates (2026-09-01 to 2026-09-10)"),
      "Message details trip date boundaries"
    );
    assert(
      outsideTripIssue?.resolutionAction?.date === "2026-09-10",
      "Resolution action proposes moving to trip endDate (2026-09-10)"
    );
  } catch (err: any) {
    assert(false, "Test 4 failed", err.message);
  }

  // =========================================================================
  // TEST 5: DETECT IMPOSSIBLE CITY TRANSITIONS (IMPOSSIBLE_TRANSITION)
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("5. DETECT IMPOSSIBLE CITY TRANSITIONS (IMPOSSIBLE_TRANSITION)");
  console.log("------------------------------------------------------------");

  try {
    const transitionActs = [
      {
        id: "act-trans-paris",
        tripStopId: "stop-paris",
        activityId: "catalog-louvre",
        activityName: "Louvre Museum",
        category: "culture",
        durationMinutes: 150,
        customCost: null,
        estimatedCost: 22,
        activityDate: "2026-09-05",
        startTime: "14:00",
        endTime: "16:30",
        status: "confirmed",
        cityName: "Paris",
      },
      {
        id: "act-trans-rome",
        tripStopId: "stop-rome",
        activityId: "catalog-colosseum",
        activityName: "Colosseum Tour",
        category: "culture",
        durationMinutes: 120,
        customCost: null,
        estimatedCost: 35,
        activityDate: "2026-09-05", // Same day!
        startTime: "17:30", // Only 1 hour after Paris activity finishes!
        endTime: "19:30",
        status: "confirmed",
        cityName: "Rome",
      },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      transitionActs
    );

    assert(result.hasIssues === true, "Detected impossible city transit conflict on same date");
    const transitionIssue = result.issues.find((i) => i.type === "IMPOSSIBLE_TRANSITION");
    assert(Boolean(transitionIssue), "Identified issue with type 'IMPOSSIBLE_TRANSITION'");
    assert(transitionIssue?.severity === "warning", "Transition issue severity is 'warning'");
    assert(
      transitionIssue?.message.includes("Paris") && transitionIssue?.message.includes("Rome"),
      "Message explains insufficient transit buffer between Paris and Rome"
    );
    assert(
      transitionIssue?.resolutionAction?.date === "2026-09-06",
      "Resolution action proposes moving Rome activity to next day (2026-09-06)"
    );
  } catch (err: any) {
    assert(false, "Test 5 failed", err.message);
  }

  // =========================================================================
  // TEST 6: DETECT EXCESSIVE SINGLE-DAY DENSITY (EXCESSIVE_DENSITY)
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("6. DETECT EXCESSIVE SINGLE-DAY DENSITY (EXCESSIVE_DENSITY)");
  console.log("------------------------------------------------------------");

  try {
    const denseDayActs = [
      { id: "d1", tripStopId: "stop-paris", activityId: "c1", activityName: "Bakery Workshop", category: "food", durationMinutes: 90, customCost: null, estimatedCost: 15, activityDate: "2026-09-02", startTime: "08:00", endTime: "09:30", status: "confirmed", cityName: "Paris" },
      { id: "d2", tripStopId: "stop-paris", activityId: "c2", activityName: "Notre-Dame Walk", category: "sightseeing", durationMinutes: 90, customCost: null, estimatedCost: 10, activityDate: "2026-09-02", startTime: "10:00", endTime: "11:30", status: "confirmed", cityName: "Paris" },
      { id: "d3", tripStopId: "stop-paris", activityId: "c3", activityName: "Louvre Museum", category: "culture", durationMinutes: 180, customCost: null, estimatedCost: 22, activityDate: "2026-09-02", startTime: "12:00", endTime: "15:00", status: "confirmed", cityName: "Paris" },
      { id: "d4", tripStopId: "stop-paris", activityId: "c4", activityName: "Eiffel Tower", category: "sightseeing", durationMinutes: 120, customCost: null, estimatedCost: 28, activityDate: "2026-09-02", startTime: "15:30", endTime: "17:30", status: "confirmed", cityName: "Paris" },
      { id: "d5", tripStopId: "stop-paris", activityId: "c5", activityName: "Catacombs Tour", category: "culture", durationMinutes: 120, customCost: null, estimatedCost: 29, activityDate: "2026-09-02", startTime: "18:00", endTime: "20:00", status: "confirmed", cityName: "Paris" },
      { id: "d6", tripStopId: "stop-paris", activityId: "c6", activityName: "Moulin Rouge Cabaret", category: "entertainment", durationMinutes: 120, customCost: null, estimatedCost: 95, activityDate: "2026-09-02", startTime: "21:00", endTime: "23:00", status: "confirmed", cityName: "Paris" },
    ];

    const result = schedulingIntelligenceService.evaluateRules(
      tripFixture,
      stopsFixture,
      denseDayActs
    );

    assert(result.hasIssues === true, "Detected high schedule density on overloaded day");
    const densityIssue = result.issues.find((i) => i.type === "EXCESSIVE_DENSITY");
    assert(Boolean(densityIssue), "Identified issue with type 'EXCESSIVE_DENSITY'");
    assert(densityIssue?.severity === "warning", "Density severity is 'warning'");
    assert(
      densityIssue?.message.includes("6 activities scheduled"),
      "Message notes 6 scheduled activities"
    );
  } catch (err: any) {
    assert(false, "Test 6 failed", err.message);
  }

  // =========================================================================
  // TEST 7: RESOLUTION ACTION VALIDATION & APPLICATION
  // =========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("7. RESOLUTION ACTION VALIDATION & APPLICATION");
  console.log("------------------------------------------------------------");

  try {
    // 7.1 Validate invalid resolve action payloads
    const invalidActions: Array<{ name: string; payload: unknown; expectedSnippet: string }> = [
      {
        name: "Missing action object",
        payload: {},
        expectedSnippet: "action object is required",
      },
      {
        name: "Invalid action type",
        payload: { action: { type: "UNKNOWN_ACTION", activityId: "11111111-1111-4111-a111-111111111111" } },
        expectedSnippet: "must be one of",
      },
      {
        name: "Non-uuid activityId",
        payload: { action: { type: "UPDATE_ACTIVITY_TIME", activityId: "not-a-uuid", startTime: "10:00", endTime: "12:00" } },
        expectedSnippet: "must be a UUID",
      },
      {
        name: "Invalid date format",
        payload: { action: { type: "UPDATE_ACTIVITY_DATE", activityId: "11111111-1111-4111-a111-111111111111", date: "Sept 10" } },
        expectedSnippet: "must be an ISO date",
      },
      {
        name: "Invalid time format",
        payload: { action: { type: "UPDATE_ACTIVITY_TIME", activityId: "11111111-1111-4111-a111-111111111111", startTime: "invalid_time" } },
        expectedSnippet: "must be in HH:MM format",
      },
    ];

    for (const tc of invalidActions) {
      try {
        validateResolveSchedulingIssueInput({ body: tc.payload } as any);
        assert(false, `Payload '${tc.name}' should have failed validation`);
      } catch (err: any) {
        const isHttp400 = (err instanceof HttpError || err.name === "HttpError") && (err.statusCode === 400 || err.status === 400);
        const hasSnippet = err.message.toLowerCase().includes(tc.expectedSnippet.toLowerCase());
        assert(isHttp400 && hasSnippet, `Rejected invalid resolution payload: ${tc.name} [${err.message}]`);
      }
    }

    // 7.2 Validate valid resolution action payload
    const validResolutionPayload = {
      action: {
        type: "UPDATE_ACTIVITY_TIME",
        activityId: "11111111-1111-4111-a111-111111111111",
        startTime: "13:00",
        endTime: "15:00",
      },
    };
    validateResolveSchedulingIssueInput({ body: validResolutionPayload } as any);
    assert(true, "Valid resolution action passes validator");

    // 7.3 Simulate applying resolution to clear the conflict
    const activeSchedule = [
      {
        id: "act-1",
        tripStopId: "stop-paris",
        activityId: "catalog-louvre",
        activityName: "Louvre Museum",
        category: "culture",
        durationMinutes: 180,
        customCost: null,
        estimatedCost: 22,
        activityDate: "2026-09-02",
        startTime: "09:30",
        endTime: "12:30",
        status: "confirmed",
        cityName: "Paris",
      },
      {
        id: "act-2",
        tripStopId: "stop-paris",
        activityId: "catalog-eiffel",
        activityName: "Eiffel Tower Summit",
        category: "sightseeing",
        durationMinutes: 120,
        customCost: null,
        estimatedCost: 28,
        activityDate: "2026-09-02",
        startTime: "11:00",
        endTime: "13:00",
        status: "confirmed",
        cityName: "Paris",
      },
    ];

    // Pre-resolution has overlap
    const preRes = schedulingIntelligenceService.evaluateRules(tripFixture, stopsFixture, activeSchedule);
    assert(preRes.issues.some((i) => i.type === "OVERLAP"), "Initial state has active overlap conflict");

    // Apply suggested resolution: move Eiffel Tower Summit to start at 12:30
    const act2 = activeSchedule.find((a) => a.id === "act-2");
    if (act2) {
      act2.startTime = "12:30";
      act2.endTime = "14:30";
    }

    // Post-resolution check
    const postRes = schedulingIntelligenceService.evaluateRules(tripFixture, stopsFixture, activeSchedule);
    assert(postRes.hasIssues === false, "After applying resolution, schedule is completely healthy with 0 conflicts");
  } catch (err: any) {
    assert(false, "Test 7 failed", err.message);
  }

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log("\n============================================================");
  console.log(`  FINAL RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
