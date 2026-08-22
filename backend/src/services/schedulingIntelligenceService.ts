import { db } from "../config/db.js";
import { HttpError } from "../types/errors.js";
import type {
  ResolutionAction,
  SchedulingIntelligenceResponse,
  SchedulingIssue,
} from "../types/schedulingIntelligence.js";

type TripData = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type StopData = {
  id: string;
  cityId: string;
  cityName: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  stopOrder: number;
};

type ActivityData = {
  id: string;
  tripStopId: string;
  activityId: string;
  activityName: string;
  category: string;
  durationMinutes: number;
  customCost: number | null;
  estimatedCost: number;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  cityName?: string;
  cityId?: string;
};

export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTime = (totalMinutes: number): string => {
  const normalized = Math.min(23 * 60 + 59, Math.max(0, totalMinutes));
  const h = Math.floor(normalized / 60).toString().padStart(2, "0");
  const m = (normalized % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const schedulingIntelligenceService = {
  async analyze(userId: string, tripId: string): Promise<SchedulingIntelligenceResponse> {
    // 1. Fetch Trip
    const tripRes = await db.query<TripData>(
      `SELECT id, name, start_date AS "startDate", end_date AS "endDate"
       FROM trips WHERE id = $1 AND user_id = $2`,
      [tripId, userId]
    );
    const trip = tripRes.rows[0];
    if (!trip) throw new HttpError("Trip not found.", 404);

    // 2. Fetch Stops
    const stopsRes = await db.query<StopData>(
      `SELECT ts.id, ts.city_id AS "cityId", c.name AS "cityName", c.country,
              ts.arrival_date AS "arrivalDate", ts.departure_date AS "departureDate",
              ts.stop_order AS "stopOrder"
       FROM trip_stops ts
       JOIN cities c ON c.id = ts.city_id
       WHERE ts.trip_id = $1
       ORDER BY ts.stop_order ASC`,
      [tripId]
    );
    const stops = stopsRes.rows;

    // 3. Fetch Activities
    const actRes = await db.query<ActivityData>(
      `SELECT ta.id, ta.trip_stop_id AS "tripStopId", ta.activity_id AS "activityId",
              a.name AS "activityName", a.category, a.duration_minutes AS "durationMinutes",
              ta.custom_cost AS "customCost", a.estimated_cost AS "estimatedCost",
              ta.activity_date AS "activityDate", ta.start_time AS "startTime",
              ta.end_time AS "endTime", ta.status, c.name AS "cityName", c.id AS "cityId"
       FROM trip_activities ta
       JOIN activities a ON a.id = ta.activity_id
       JOIN trip_stops ts ON ts.id = ta.trip_stop_id
       JOIN cities c ON c.id = ts.city_id
       WHERE ta.trip_id = $1 AND ta.status <> 'cancelled'
       ORDER BY ta.activity_date ASC, ta.start_time ASC NULLS LAST`,
      [tripId]
    );
    const activities = actRes.rows;

    return this.evaluateRules(trip, stops, activities);
  },

  evaluateRules(
    trip: TripData,
    stops: StopData[],
    activities: ActivityData[]
  ): SchedulingIntelligenceResponse {
    const issues: SchedulingIssue[] = [];
    const stopMap = new Map<string, StopData>(stops.map((s) => [s.id, s]));

    // -------------------------------------------------------------
    // RULE 1 & 2: Invalid Activity Times & Dates
    // -------------------------------------------------------------
    for (const act of activities) {
      const stop = stopMap.get(act.tripStopId);

      // 2. Invalid Activity Times (startTime >= endTime)
      if (act.startTime && act.endTime) {
        const startM = timeToMinutes(act.startTime);
        const endM = timeToMinutes(act.endTime);

        if (endM <= startM) {
          const duration = act.durationMinutes || 120;
          const suggestedEnd = minutesToTime(Math.min(23 * 60 + 59, startM + duration));

          issues.push({
            id: `issue-invalid-time-${act.id}`,
            type: "INVALID_TIME",
            severity: "error",
            message: `'${act.activityName}' on ${act.activityDate} has invalid times: end time (${act.endTime}) must be after start time (${act.startTime}).`,
            date: act.activityDate,
            affectedActivityId: act.id,
            affectedActivityName: act.activityName,
            suggestion: `Adjust end time to ${suggestedEnd} based on ${duration}-minute activity duration.`,
            resolutionAction: {
              type: "UPDATE_ACTIVITY_TIME",
              activityId: act.id,
              startTime: act.startTime,
              endTime: suggestedEnd,
            },
          });
        }
      }

      // 4. Activity Outside Trip Dates
      if (act.activityDate < trip.startDate || act.activityDate > trip.endDate) {
        const targetDate = act.activityDate < trip.startDate ? trip.startDate : trip.endDate;
        issues.push({
          id: `issue-outside-trip-${act.id}`,
          type: "OUTSIDE_TRIP_DATES",
          severity: "error",
          message: `'${act.activityName}' is scheduled on ${act.activityDate}, which is outside trip dates (${trip.startDate} to ${trip.endDate}).`,
          date: act.activityDate,
          affectedActivityId: act.id,
          affectedActivityName: act.activityName,
          suggestion: `Reschedule '${act.activityName}' to ${targetDate} within trip range.`,
          resolutionAction: {
            type: "UPDATE_ACTIVITY_DATE",
            activityId: act.id,
            date: targetDate,
          },
        });
      }

      // 3. Activity Outside Stop Dates
      if (stop && (act.activityDate < stop.arrivalDate || act.activityDate > stop.departureDate)) {
        const targetDate = act.activityDate < stop.arrivalDate ? stop.arrivalDate : stop.departureDate;
        issues.push({
          id: `issue-outside-stop-${act.id}`,
          type: "OUTSIDE_STOP_DATES",
          severity: "error",
          message: `'${act.activityName}' is scheduled on ${act.activityDate}, but ${stop.cityName} stop is from ${stop.arrivalDate} to ${stop.departureDate}.`,
          date: act.activityDate,
          affectedActivityId: act.id,
          affectedActivityName: act.activityName,
          suggestion: `Move '${act.activityName}' to ${targetDate} (within ${stop.cityName} stop dates).`,
          resolutionAction: {
            type: "UPDATE_ACTIVITY_DATE",
            activityId: act.id,
            date: targetDate,
          },
        });
      }
    }

    // -------------------------------------------------------------
    // RULE 1: Overlapping Activities
    // -------------------------------------------------------------
    const dateGroups = new Map<string, ActivityData[]>();
    for (const act of activities) {
      if (!dateGroups.has(act.activityDate)) {
        dateGroups.set(act.activityDate, []);
      }
      dateGroups.get(act.activityDate)!.push(act);
    }

    for (const [date, dayActs] of dateGroups.entries()) {
      const timedActs = dayActs
        .filter((a) => a.startTime && a.endTime && timeToMinutes(a.endTime) > timeToMinutes(a.startTime))
        .sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));

      for (let i = 0; i < timedActs.length; i++) {
        for (let j = i + 1; j < timedActs.length; j++) {
          const actA = timedActs[i];
          const actB = timedActs[j];

          const startA = timeToMinutes(actA.startTime!);
          const endA = timeToMinutes(actA.endTime!);
          const startB = timeToMinutes(actB.startTime!);
          const endB = timeToMinutes(actB.endTime!);

          // Check overlap
          if (startA < endB && endA > startB) {
            const durationB = actB.durationMinutes || endB - startB;
            const newStartB = endA;
            const newEndB = newStartB + durationB;
            const suggestedStart = minutesToTime(newStartB);
            const suggestedEnd = minutesToTime(newEndB);

            issues.push({
              id: `issue-overlap-${actA.id}-${actB.id}`,
              type: "OVERLAP",
              severity: "warning",
              message: `'${actA.activityName}' (${actA.startTime} - ${actA.endTime}) overlaps with '${actB.activityName}' (${actB.startTime} - ${actB.endTime}) on ${date}.`,
              date,
              affectedActivityId: actB.id,
              affectedActivityName: actB.activityName,
              conflictingActivityId: actA.id,
              conflictingActivityName: actA.activityName,
              suggestion: `Move '${actB.activityName}' to start at ${suggestedStart} (until ${suggestedEnd}) after '${actA.activityName}'.`,
              resolutionAction: {
                type: "UPDATE_ACTIVITY_TIME",
                activityId: actB.id,
                startTime: suggestedStart,
                endTime: suggestedEnd,
              },
            });
          }
        }
      }

      // -------------------------------------------------------------
      // RULE 5: Impossible City Transitions on Same Date
      // -------------------------------------------------------------
      const citiesOnDay = new Set(dayActs.map((a) => a.cityName || a.tripStopId));
      if (citiesOnDay.size > 1 && dayActs.length >= 2) {
        const sortedDayActs = [...dayActs].sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0;
          return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        });

        for (let k = 0; k < sortedDayActs.length - 1; k++) {
          const first = sortedDayActs[k];
          const second = sortedDayActs[k + 1];

          if (first.cityName && second.cityName && first.cityName !== second.cityName) {
            const gap =
              first.endTime && second.startTime
                ? timeToMinutes(second.startTime) - timeToMinutes(first.endTime)
                : 0;

            if (gap < 180) {
              const nextDay = addDays(date, 1);
              issues.push({
                id: `issue-transition-${first.id}-${second.id}`,
                type: "IMPOSSIBLE_TRANSITION",
                severity: "warning",
                message: `Tight inter-city transition on ${date}: '${first.activityName}' is in ${first.cityName}, while '${second.activityName}' is in ${second.cityName} with only ${Math.max(0, gap)} minutes transit buffer.`,
                date,
                affectedActivityId: second.id,
                affectedActivityName: second.activityName,
                conflictingActivityId: first.id,
                conflictingActivityName: first.activityName,
                suggestion: `Move '${second.activityName}' to ${nextDay} in ${second.cityName}.`,
                resolutionAction: {
                  type: "UPDATE_ACTIVITY_DATE",
                  activityId: second.id,
                  date: nextDay,
                },
              });
            }
          }
        }
      }

      // -------------------------------------------------------------
      // RULE 6: Excessive Single-Day Activity Density
      // -------------------------------------------------------------
      const totalDayMinutes = dayActs.reduce((sum, a) => {
        if (a.startTime && a.endTime) {
          const s = timeToMinutes(a.startTime);
          const e = timeToMinutes(a.endTime);
          if (e > s) return sum + (e - s);
        }
        return sum + (a.durationMinutes || 120);
      }, 0);

      if (dayActs.length >= 5 || totalDayMinutes >= 480) {
        const hours = (totalDayMinutes / 60).toFixed(1);
        issues.push({
          id: `issue-density-${date}`,
          type: "EXCESSIVE_DENSITY",
          severity: "warning",
          message: `Excessive schedule density on ${date}: ${dayActs.length} activities scheduled totaling ~${hours} hours of active sightseeing.`,
          date,
          suggestion: "Consider redistributing optional activities to adjacent days for a more relaxed itinerary.",
        });
      }
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    return {
      hasIssues: issues.length > 0,
      errorCount,
      warningCount,
      issues,
    };
  },

  async resolve(
    userId: string,
    tripId: string,
    action: ResolutionAction
  ): Promise<{ message: string; intelligence: SchedulingIntelligenceResponse }> {
    // 1. Verify trip ownership
    const tripRes = await db.query(
      `SELECT id FROM trips WHERE id = $1 AND user_id = $2`,
      [tripId, userId]
    );
    if (!tripRes.rows.length) throw new HttpError("Trip not found.", 404);

    // 2. Verify target activity exists in trip
    const actRes = await db.query<{ id: string; tripStopId: string; activityDate: string }>(
      `SELECT id, trip_stop_id AS "tripStopId", activity_date AS "activityDate"
       FROM trip_activities
       WHERE id = $1 AND trip_id = $2`,
      [action.activityId, tripId]
    );
    const existing = actRes.rows[0];
    if (!existing) throw new HttpError("Scheduled activity not found in trip.", 404);

    // 3. Execute Resolution Update
    if (action.type === "UPDATE_ACTIVITY_TIME") {
      await db.query(
        `UPDATE trip_activities
         SET start_time = $1, end_time = $2, updated_at = NOW()
         WHERE id = $3 AND trip_id = $4`,
        [action.startTime ?? null, action.endTime ?? null, action.activityId, tripId]
      );
    } else if (action.type === "UPDATE_ACTIVITY_DATE") {
      // Find matching stop covering the new date if needed
      let newStopId = action.tripStopId || existing.tripStopId;
      if (action.date) {
        const matchingStop = await db.query<{ id: string }>(
          `SELECT id FROM trip_stops
           WHERE trip_id = $1 AND $2 BETWEEN arrival_date AND departure_date
           ORDER BY stop_order ASC LIMIT 1`,
          [tripId, action.date]
        );
        if (matchingStop.rows.length > 0) {
          newStopId = matchingStop.rows[0].id;
        }
      }

      await db.query(
        `UPDATE trip_activities
         SET activity_date = $1, trip_stop_id = $2, updated_at = NOW()
         WHERE id = $3 AND trip_id = $4`,
        [action.date, newStopId, action.activityId, tripId]
      );
    } else if (action.type === "UPDATE_ACTIVITY_SCHEDULE") {
      await db.query(
        `UPDATE trip_activities
         SET activity_date = COALESCE($1, activity_date),
             start_time = $2,
             end_time = $3,
             trip_stop_id = COALESCE($4, trip_stop_id),
             updated_at = NOW()
         WHERE id = $5 AND trip_id = $6`,
        [
          action.date ?? null,
          action.startTime ?? null,
          action.endTime ?? null,
          action.tripStopId ?? null,
          action.activityId,
          tripId,
        ]
      );
    }

    const updatedIntelligence = await this.analyze(userId, tripId);

    return {
      message: "Schedule adjustment applied successfully.",
      intelligence: updatedIntelligence,
    };
  },
};
