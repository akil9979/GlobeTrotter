import type { Request } from "express";
import { HttpError } from "../types/errors.js";
import { requireDate, requireNumber, requireString, requireUuid } from "./common.js";
import type { RawAIOptimizerOutput } from "../types/aiOptimizer.js";

const body = (request: Request): Record<string, unknown> => request.body as Record<string, unknown>;

export const validateOptimizerGenerateInput = (request: Request): void => {
  const input = body(request);

  if (!input.destination || (typeof input.destination !== "string" && !Array.isArray(input.destination))) {
    throw new HttpError("destination is required and must be a city name or list of cities.", 400);
  }
  if (typeof input.destination === "string" && input.destination.trim() === "") {
    throw new HttpError("destination cannot be empty.", 400);
  }
  if (Array.isArray(input.destination) && (input.destination.length === 0 || input.destination.some((d) => typeof d !== "string" || d.trim() === ""))) {
    throw new HttpError("destination list cannot be empty or contain blank entries.", 400);
  }

  const startDate = requireDate(input.startDate, "startDate");
  const endDate = requireDate(input.endDate, "endDate");
  if (endDate < startDate) {
    throw new HttpError("endDate cannot precede startDate.", 400);
  }

  if (input.budget !== undefined && input.budget !== null) {
    const budget = requireNumber(input.budget, "budget");
    if (budget < 0) {
      throw new HttpError("budget cannot be negative.", 400);
    }
  }

  if (input.interests !== undefined && !Array.isArray(input.interests)) {
    throw new HttpError("interests must be an array of strings.", 400);
  }

  if (input.preferredActivityTypes !== undefined && !Array.isArray(input.preferredActivityTypes)) {
    throw new HttpError("preferredActivityTypes must be an array of strings.", 400);
  }

  if (input.travelStyle !== undefined && typeof input.travelStyle !== "string") {
    throw new HttpError("travelStyle must be a string.", 400);
  }

  if (input.tripId !== undefined && input.tripId !== null) {
    requireUuid(input.tripId, "tripId");
  }
};

export const validateRawOptimizerOutput = (
  raw: unknown,
  tripStartDate?: string,
  tripEndDate?: string
): RawAIOptimizerOutput => {
  if (!raw || typeof raw !== "object") {
    throw new HttpError("AI output must be a structured JSON object.", 400);
  }

  const output = raw as Partial<RawAIOptimizerOutput>;

  if (!Array.isArray(output.stops) || output.stops.length === 0) {
    throw new HttpError("AI output must contain a non-empty 'stops' array.", 400);
  }

  if (!output.estimatedBudget || typeof output.estimatedBudget !== "object") {
    throw new HttpError("AI output must contain an 'estimatedBudget' object.", 400);
  }

  const budget = output.estimatedBudget;
  const budgetFields = ["transport", "accommodation", "activities", "meals", "other", "total"] as const;
  for (const field of budgetFields) {
    const val = budget[field];
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
      throw new HttpError(`AI estimatedBudget.${field} must be a non-negative number.`, 400);
    }
  }

  let previousStopEndDate: string | null = null;

  for (let sIdx = 0; sIdx < output.stops.length; sIdx++) {
    const stop = output.stops[sIdx];
    if (!stop || typeof stop !== "object") {
      throw new HttpError(`Stop at index ${sIdx} must be a valid object.`, 400);
    }

    if (typeof stop.city !== "string" || stop.city.trim() === "") {
      throw new HttpError(`Stop at index ${sIdx} has an invalid or missing 'city'.`, 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stop.startDate)) || Number.isNaN(Date.parse(`${stop.startDate}T00:00:00Z`))) {
      throw new HttpError(`Stop at index ${sIdx} has an invalid 'startDate'. Must be YYYY-MM-DD.`, 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stop.endDate)) || Number.isNaN(Date.parse(`${stop.endDate}T00:00:00Z`))) {
      throw new HttpError(`Stop at index ${sIdx} has an invalid 'endDate'. Must be YYYY-MM-DD.`, 400);
    }

    if (stop.endDate < stop.startDate) {
      throw new HttpError(`Stop at index ${sIdx} (${stop.city}) has endDate before startDate.`, 400);
    }

    if (tripStartDate && stop.startDate < tripStartDate) {
      throw new HttpError(`Stop at index ${sIdx} (${stop.city}) starts before the trip start date.`, 400);
    }

    if (tripEndDate && stop.endDate > tripEndDate) {
      throw new HttpError(`Stop at index ${sIdx} (${stop.city}) ends after the trip end date.`, 400);
    }

    if (previousStopEndDate && stop.startDate < previousStopEndDate) {
      // Small overlap or sequence check
      if (stop.startDate < previousStopEndDate && sIdx > 0 && output.stops[sIdx - 1].startDate > stop.startDate) {
        throw new HttpError(`Stops must be in chronological order.`, 400);
      }
    }
    previousStopEndDate = stop.endDate;

    if (!Array.isArray(stop.activities)) {
      throw new HttpError(`Stop at index ${sIdx} (${stop.city}) must have an 'activities' array.`, 400);
    }

    for (let aIdx = 0; aIdx < stop.activities.length; aIdx++) {
      const act = stop.activities[aIdx];
      if (!act || typeof act !== "object") {
        throw new HttpError(`Activity at index ${aIdx} in stop '${stop.city}' must be an object.`, 400);
      }

      if (typeof act.name !== "string" || act.name.trim() === "") {
        throw new HttpError(`Activity at index ${aIdx} in stop '${stop.city}' must have a valid 'name'.`, 400);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(act.date)) || Number.isNaN(Date.parse(`${act.date}T00:00:00Z`))) {
        throw new HttpError(`Activity '${act.name}' has an invalid 'date'. Must be YYYY-MM-DD.`, 400);
      }

      if (act.date < stop.startDate || act.date > stop.endDate) {
        throw new HttpError(`Activity '${act.name}' date (${act.date}) is outside stop date range (${stop.startDate} to ${stop.endDate}).`, 400);
      }

      if (tripStartDate && act.date < tripStartDate) {
        throw new HttpError(`Activity '${act.name}' date is before trip start date.`, 400);
      }

      if (tripEndDate && act.date > tripEndDate) {
        throw new HttpError(`Activity '${act.name}' date is after trip end date.`, 400);
      }

      if (act.startTime !== undefined && act.startTime !== null && act.startTime !== "") {
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(act.startTime))) {
          throw new HttpError(`Activity '${act.name}' has invalid startTime format. Use HH:MM.`, 400);
        }
      }

      if (act.endTime !== undefined && act.endTime !== null && act.endTime !== "") {
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(act.endTime))) {
          throw new HttpError(`Activity '${act.name}' has invalid endTime format. Use HH:MM.`, 400);
        }
      }

      if (act.startTime && act.endTime) {
        if (act.endTime <= act.startTime) {
          throw new HttpError(`Activity '${act.name}' endTime must be after startTime.`, 400);
        }
      }

      if (act.estimatedCost !== undefined && act.estimatedCost !== null) {
        if (typeof act.estimatedCost !== "number" || !Number.isFinite(act.estimatedCost) || act.estimatedCost < 0) {
          throw new HttpError(`Activity '${act.name}' estimatedCost must be a non-negative number.`, 400);
        }
      }
    }
  }

  return raw as RawAIOptimizerOutput;
};

export const validateOptimizerApplyInput = (request: Request): void => {
  const input = body(request);

  if (!input.recommendation || typeof input.recommendation !== "object") {
    throw new HttpError("recommendation object is required to apply an itinerary.", 400);
  }

  const rec = input.recommendation as Record<string, unknown>;
  validateRawOptimizerOutput(rec);

  if (input.tripId !== undefined && input.tripId !== null) {
    requireUuid(input.tripId, "tripId");
  }

  if (input.tripName !== undefined && typeof input.tripName !== "string") {
    throw new HttpError("tripName must be a string.", 400);
  }

  if (input.overwriteExisting !== undefined && typeof input.overwriteExisting !== "boolean") {
    throw new HttpError("overwriteExisting must be a boolean.", 400);
  }
};
