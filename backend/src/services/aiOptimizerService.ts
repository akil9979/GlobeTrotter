import { db } from "../config/db.js";
import { HttpError } from "../types/errors.js";
import type {
  ApplyOptimizerInput,
  BudgetStatus,
  MatchedActivity,
  MatchedStop,
  RawAIOptimizerOutput,
  RawActivityRecommendation,
  RawBudgetEstimate,
  RawStopRecommendation,
  TripOptimizerInput,
  ValidatedOptimizerRecommendation,
} from "../types/aiOptimizer.js";
import { validateRawOptimizerOutput } from "../validators/aiOptimizerValidators.js";
import { itineraryService } from "./itineraryService.js";
import { tripService } from "./tripService.js";

type DbCity = {
  id: string;
  name: string;
  country: string;
  image: string | null;
  costIndex: number | null;
};

type DbActivity = {
  id: string;
  cityId: string;
  name: string;
  category: string;
  durationMinutes: number | null;
  estimatedCost: number | null;
  image: string | null;
  description: string | null;
};

const sanitizeCategory = (category?: string): string => {
  const valid = ["sightseeing", "culture", "food", "outdoor", "entertainment", "shopping", "other"];
  if (category && valid.includes(category.toLowerCase())) {
    return category.toLowerCase();
  }
  return "sightseeing";
};

const parseDestinations = (dest: string | string[]): string[] => {
  if (Array.isArray(dest)) {
    return dest.map((d) => d.trim()).filter(Boolean);
  }
  return dest
    .split(/[,;&+]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const formatIsoDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDate(d);
};

const daysBetween = (start: string, end: string): number => {
  const s = new Date(`${start}T00:00:00Z`).getTime();
  const e = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
};

// Built-in intelligent generator for AI optimization
const generateOptimizerPlan = (
  input: TripOptimizerInput,
  dbCities: DbCity[],
  dbActivitiesByCityId: Map<string, DbActivity[]>
): RawAIOptimizerOutput => {
  const destinations = parseDestinations(input.destination);
  const totalDays = daysBetween(input.startDate, input.endDate);

  // Match or assign cities
  const selectedCities: Array<{ name: string; dbCity?: DbCity }> = [];
  for (const dest of destinations) {
    const match = dbCities.find(
      (c) => c.name.toLowerCase() === dest.toLowerCase() || dest.toLowerCase().includes(c.name.toLowerCase())
    );
    selectedCities.push({ name: match ? match.name : dest, dbCity: match });
  }

  if (selectedCities.length === 0) {
    const fallbackCity = dbCities[0] ?? { name: "Paris" };
    selectedCities.push({ name: fallbackCity.name, dbCity: fallbackCity });
  }

  // Allocate days among cities
  const numCities = selectedCities.length;
  const daysPerCity = Math.max(1, Math.floor(totalDays / numCities));
  let remainingDays = totalDays;
  let currentDate = input.startDate;

  const stops: RawStopRecommendation[] = [];
  let totalActivityCost = 0;

  for (let i = 0; i < numCities; i++) {
    const isLast = i === numCities - 1;
    const cityDays = isLast ? remainingDays : Math.min(daysPerCity, remainingDays);
    remainingDays -= cityDays;

    const stopArrival = currentDate;
    const stopDeparture = addDays(stopArrival, cityDays - 1);
    currentDate = addDays(stopDeparture, 1);

    const cityObj = selectedCities[i];
    const catalogActivities = cityObj.dbCity
      ? dbActivitiesByCityId.get(cityObj.dbCity.id) ?? []
      : [];

    const activities: RawActivityRecommendation[] = [];

    // Schedule 2-3 activities per day
    let activityIndex = 0;
    for (let dayOffset = 0; dayOffset < cityDays; dayOffset++) {
      const actDate = addDays(stopArrival, dayOffset);
      const isRelaxed = input.travelStyle?.toLowerCase() === "relaxed";
      const slotsCount = isRelaxed ? 2 : 3;

      const timeSlots = [
        { start: "09:30", end: "12:30", defaultName: `${cityObj.name} Landmark Tour`, cat: "sightseeing", cost: 500 },
        { start: "14:00", end: "16:30", defaultName: `${cityObj.name} Cultural Discovery`, cat: "culture", cost: 300 },
        { start: "18:30", end: "21:00", defaultName: `${cityObj.name} Gourmet Tasting`, cat: "food", cost: 800 },
      ];

      for (let s = 0; s < slotsCount; s++) {
        const slot = timeSlots[s];
        let name = slot.defaultName;
        let cost = slot.cost;
        let category = slot.cat;
        let description = `Explore the best of ${cityObj.name}.`;

        if (catalogActivities.length > 0) {
          const catAct = catalogActivities[activityIndex % catalogActivities.length];
          activityIndex++;
          name = catAct.name;
          cost = catAct.estimatedCost !== null && Number(catAct.estimatedCost) > 0 ? Number(catAct.estimatedCost) : slot.cost;
          category = catAct.category;
          description = catAct.description ?? description;
        } else if (input.interests && input.interests.length > 0) {
          const interest = input.interests[(activityIndex + s) % input.interests.length];
          name = `${cityObj.name} ${interest.charAt(0).toUpperCase() + interest.slice(1)} Experience`;
          category = sanitizeCategory(input.preferredActivityTypes?.[0] ?? slot.cat);
        }

        totalActivityCost += cost;
        activities.push({
          name,
          date: actDate,
          startTime: slot.start,
          endTime: slot.end,
          estimatedCost: cost,
          category,
          description,
        });
      }
    }

    stops.push({
      city: cityObj.name,
      startDate: stopArrival,
      endDate: stopDeparture,
      activities,
    });
  }

  // Budget calculations in INR
  const isBudgetFriendly = input.travelStyle?.toLowerCase() === "budget-friendly";
  const isLuxury = input.travelStyle?.toLowerCase() === "luxury";

  const dailyTransportRate = isBudgetFriendly ? 500 : isLuxury ? 2500 : 1200;
  const dailyAccommodationRate = isBudgetFriendly ? 1500 : isLuxury ? 12000 : 4000;
  const dailyMealsRate = isBudgetFriendly ? 800 : isLuxury ? 5000 : 2000;
  const dailyOtherRate = isBudgetFriendly ? 300 : isLuxury ? 2000 : 800;

  const transport = Math.round(dailyTransportRate * totalDays + (numCities > 1 ? (numCities - 1) * 1500 : 0));
  const accommodation = Math.round(dailyAccommodationRate * totalDays);
  const activitiesTotal = Math.round(totalActivityCost);
  const meals = Math.round(dailyMealsRate * totalDays);
  const other = Math.round(dailyOtherRate * totalDays);
  const total = transport + accommodation + activitiesTotal + meals + other;

  const estimatedBudget: RawBudgetEstimate = {
    transport,
    accommodation,
    activities: activitiesTotal,
    meals,
    other,
    total,
  };

  return {
    stops,
    estimatedBudget,
  };
};

export const aiOptimizerService = {
  async generate(userId: string, input: TripOptimizerInput): Promise<ValidatedOptimizerRecommendation> {
    // 1. Fetch cities & activity catalog from database
    const citiesResult = await db.query<DbCity>(
      `SELECT id, name, country, image, cost_index AS "costIndex" FROM cities ORDER BY popularity DESC NULLS LAST`
    );
    const dbCities = citiesResult.rows;

    const activitiesResult = await db.query<DbActivity>(
      `SELECT id, city_id AS "cityId", name, category, duration_minutes AS "durationMinutes", estimated_cost AS "estimatedCost", image, description FROM activities`
    );
    const dbActivities = activitiesResult.rows;

    const dbActivitiesByCityId = new Map<string, DbActivity[]>();
    for (const act of dbActivities) {
      if (!dbActivitiesByCityId.has(act.cityId)) {
        dbActivitiesByCityId.set(act.cityId, []);
      }
      dbActivitiesByCityId.get(act.cityId)!.push(act);
    }

    // 2. Generate structured recommendations via AI generator
    const rawOutput = generateOptimizerPlan(input, dbCities, dbActivitiesByCityId);

    // 3. Strict Backend Validation
    return this.validateAndMatchOutput(rawOutput, input, dbCities, dbActivities);
  },

  async validateAndMatchOutput(
    rawOutput: unknown,
    input: { startDate?: string; endDate?: string; budget?: number | null },
    preloadedCities?: DbCity[],
    preloadedActivities?: DbActivity[]
  ): Promise<ValidatedOptimizerRecommendation> {
    // 1. Strict Schema & Date Range Validation
    const validatedRaw = validateRawOptimizerOutput(rawOutput, input.startDate, input.endDate);

    // 2. Query DB for matching cities & activities if not preloaded
    const dbCities = preloadedCities ?? (await db.query<DbCity>(
      `SELECT id, name, country, image, cost_index AS "costIndex" FROM cities`
    )).rows;

    const dbActivities = preloadedActivities ?? (await db.query<DbActivity>(
      `SELECT id, city_id AS "cityId", name, category, duration_minutes AS "durationMinutes", estimated_cost AS "estimatedCost", image, description FROM activities`
    )).rows;

    const warnings: string[] = [];
    const matchedStops: MatchedStop[] = [];

    let totalCalculatedActivityCost = 0;

    for (const stop of validatedRaw.stops) {
      const matchedCity = dbCities.find(
        (c) => c.name.toLowerCase() === stop.city.trim().toLowerCase() ||
               c.name.toLowerCase().includes(stop.city.trim().toLowerCase()) ||
               stop.city.trim().toLowerCase().includes(c.name.toLowerCase())
      );

      if (!matchedCity) {
        warnings.push(`City '${stop.city}' is not in the verified destinations catalog. It will be added on approval.`);
      }

      const matchedActivities: MatchedActivity[] = [];

      for (const act of stop.activities) {
        totalCalculatedActivityCost += act.estimatedCost || 0;

        let matchedAct: DbActivity | undefined;
        if (matchedCity) {
          matchedAct = dbActivities.find(
            (a) => a.cityId === matchedCity.id &&
                   (a.name.toLowerCase() === act.name.trim().toLowerCase() ||
                    a.name.toLowerCase().includes(act.name.trim().toLowerCase()) ||
                    act.name.trim().toLowerCase().includes(a.name.toLowerCase()))
          );
        }

        matchedActivities.push({
          name: act.name,
          date: act.date,
          startTime: act.startTime || null,
          endTime: act.endTime || null,
          estimatedCost: act.estimatedCost || 0,
          category: sanitizeCategory(act.category || matchedAct?.category),
          description: act.description || matchedAct?.description || null,
          matchedActivityId: matchedAct?.id || null,
          isExistingInDb: Boolean(matchedAct),
        });
      }

      matchedStops.push({
        city: matchedCity ? matchedCity.name : stop.city,
        cityId: matchedCity ? matchedCity.id : null,
        country: matchedCity ? matchedCity.country : undefined,
        image: matchedCity ? matchedCity.image : null,
        matchedCity: matchedCity ? { id: matchedCity.id, name: matchedCity.name, country: matchedCity.country, image: matchedCity.image } : null,
        startDate: stop.startDate,
        endDate: stop.endDate,
        activities: matchedActivities,
      });
    }

    // 3. Reconcile and calculate budget
    const budget = validatedRaw.estimatedBudget;
    const finalBudget: RawBudgetEstimate = {
      transport: budget.transport,
      accommodation: budget.accommodation,
      activities: totalCalculatedActivityCost,
      meals: budget.meals,
      other: budget.other,
      total: budget.transport + budget.accommodation + totalCalculatedActivityCost + budget.meals + budget.other,
    };

    const userBudget = input.budget !== undefined && input.budget !== null ? Number(input.budget) : null;
    const isOverBudget = userBudget !== null && finalBudget.total > userBudget;
    const overBudgetAmount = isOverBudget ? finalBudget.total - userBudget : 0;
    const remainingBudget = userBudget !== null ? userBudget - finalBudget.total : null;

    if (isOverBudget) {
      warnings.push(
        `Estimated itinerary cost ($${finalBudget.total}) exceeds planned budget ($${userBudget}) by $${overBudgetAmount}.`
      );
    }

    const budgetStatus: BudgetStatus = {
      userBudget,
      totalEstimated: finalBudget.total,
      isOverBudget,
      overBudgetAmount,
      remainingBudget,
    };

    return {
      stops: matchedStops,
      estimatedBudget: finalBudget,
      budgetStatus,
      warnings,
    };
  },

  async apply(userId: string, input: ApplyOptimizerInput) {
    const { tripId, tripName, recommendation, overwriteExisting } = input;

    // Validate recommendation structure
    const validated = await this.validateAndMatchOutput(recommendation, {
      budget: recommendation.budgetStatus.userBudget,
    });

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      let resolvedTripId = tripId;

      if (resolvedTripId) {
        // Verify ownership
        const existingTripResult = await client.query<{ id: string; name: string }>(
          `SELECT id, name FROM trips WHERE id = $1 AND user_id = $2`,
          [resolvedTripId, userId]
        );
        if (!existingTripResult.rows.length) {
          throw new HttpError("Trip not found or access denied.", 404);
        }

        // Check if stops already exist
        const existingStopsResult = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM trip_stops WHERE trip_id = $1`,
          [resolvedTripId]
        );
        const existingCount = parseInt(existingStopsResult.rows[0]?.count || "0", 10);

        if (existingCount > 0 && !overwriteExisting) {
          throw new HttpError(
            "This trip already contains existing stops and activities. Please confirm overwrite to proceed.",
            409,
            { requiresConfirmation: true, existingStopsCount: existingCount }
          );
        }

        if (existingCount > 0 && overwriteExisting) {
          // Delete existing stops (cascades to trip_activities)
          await client.query(`DELETE FROM trip_stops WHERE trip_id = $1`, [resolvedTripId]);
        }

        // Update trip budget and name if provided
        await client.query(
          `UPDATE trips SET budget = COALESCE($1, budget), name = COALESCE($2, name), updated_at = NOW() WHERE id = $3 AND user_id = $4`,
          [validated.budgetStatus.userBudget ?? validated.estimatedBudget.total, tripName || null, resolvedTripId, userId]
        );
      } else {
        // Create new trip
        const earliestDate = validated.stops[0].startDate;
        const latestDate = validated.stops[validated.stops.length - 1].endDate;
        const defaultName = tripName || `Journey to ${validated.stops.map((s) => s.city).join(" & ")}`;

        const newTripResult = await client.query<{ id: string }>(
          `INSERT INTO trips (user_id, name, start_date, end_date, budget, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            userId,
            defaultName,
            earliestDate,
            latestDate,
            validated.budgetStatus.userBudget ?? validated.estimatedBudget.total,
            `AI-optimized itinerary for ${validated.stops.map((s) => s.city).join(", ")}.`,
          ]
        );

        resolvedTripId = newTripResult.rows[0].id;
      }

      // Insert stops and activities
      for (let sIdx = 0; sIdx < validated.stops.length; sIdx++) {
        const stop = validated.stops[sIdx];

        // Resolve or create city in database
        let cityId = stop.cityId;
        if (!cityId) {
          const cityCheck = await client.query<{ id: string }>(
            `SELECT id FROM cities WHERE lower(name) = lower($1) LIMIT 1`,
            [stop.city.trim()]
          );
          if (cityCheck.rows.length) {
            cityId = cityCheck.rows[0].id;
          } else {
            // Create city
            const newCity = await client.query<{ id: string }>(
              `INSERT INTO cities (name, country, country_code, description)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [stop.city.trim(), stop.country || "International", "XX", `Destination ${stop.city}.`]
            );
            cityId = newCity.rows[0].id;
          }
        }

        // Insert trip stop
        const stopResult = await client.query<{ id: string }>(
          `INSERT INTO trip_stops (trip_id, city_id, stop_order, arrival_date, departure_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            resolvedTripId,
            cityId,
            sIdx + 1,
            stop.startDate,
            stop.endDate,
            `Stop ${sIdx + 1}: ${stop.city}`,
          ]
        );
        const tripStopId = stopResult.rows[0].id;

        // Insert activities
        for (let aIdx = 0; aIdx < stop.activities.length; aIdx++) {
          const act = stop.activities[aIdx];

          let activityId = act.matchedActivityId;

          if (!activityId) {
            // Check if activity with same name exists for this city
            const actCheck = await client.query<{ id: string }>(
              `SELECT id FROM activities WHERE city_id = $1 AND lower(name) = lower($2) LIMIT 1`,
              [cityId, act.name.trim()]
            );

            if (actCheck.rows.length) {
              activityId = actCheck.rows[0].id;
            } else {
              // Insert into catalog
              const newAct = await client.query<{ id: string }>(
                `INSERT INTO activities (city_id, name, category, duration_minutes, estimated_cost, description)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                  cityId,
                  act.name.trim(),
                  sanitizeCategory(act.category),
                  90,
                  act.estimatedCost,
                  act.description || `Activity in ${stop.city}.`,
                ]
              );
              activityId = newAct.rows[0].id;
            }
          }

          // Insert trip activity
          await client.query(
            `INSERT INTO trip_activities (trip_id, trip_stop_id, activity_id, activity_date, start_time, end_time, custom_cost, status, sort_order, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned', $8, $9)`,
            [
              resolvedTripId,
              tripStopId,
              activityId,
              act.date,
              act.startTime || null,
              act.endTime || null,
              act.estimatedCost,
              aIdx + 1,
              act.description || null,
            ]
          );
        }
      }

      await client.query("COMMIT");

      // Load full created/updated trip and itinerary
      const [trip, itinerary] = await Promise.all([
        tripService.get(userId, resolvedTripId, true),
        itineraryService.get(userId, resolvedTripId),
      ]);

      return {
        tripId: resolvedTripId,
        trip,
        itinerary,
        message: "AI-optimized itinerary successfully applied!",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
