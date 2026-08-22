import type { Request } from "express";
import { HttpError } from "../types/errors.js";
import { requireUuid, optionalString } from "./common.js";

const body = (request: Request): Record<string, unknown> => request.body as Record<string, unknown>;

export const validateResolveSchedulingIssueInput = (request: Request): void => {
  const input = body(request);

  if (!input.action || typeof input.action !== "object") {
    throw new HttpError("action object is required.", 400);
  }

  const action = input.action as Record<string, unknown>;

  const validActionTypes = ["UPDATE_ACTIVITY_TIME", "UPDATE_ACTIVITY_DATE", "UPDATE_ACTIVITY_SCHEDULE"];
  if (typeof action.type !== "string" || !validActionTypes.includes(action.type)) {
    throw new HttpError(
      `action.type must be one of: ${validActionTypes.join(", ")}.`,
      400
    );
  }

  requireUuid(action.activityId, "action.activityId");

  if (action.tripStopId !== undefined && action.tripStopId !== null) {
    requireUuid(action.tripStopId, "action.tripStopId");
  }

  if (action.date !== undefined && action.date !== null) {
    if (typeof action.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(action.date)) {
      throw new HttpError("action.date must be an ISO date (YYYY-MM-DD).", 400);
    }
  }

  if (action.startTime !== undefined && action.startTime !== null) {
    if (typeof action.startTime !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(action.startTime)) {
      throw new HttpError("action.startTime must be in HH:MM format.", 400);
    }
  }

  if (action.endTime !== undefined && action.endTime !== null) {
    if (typeof action.endTime !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(action.endTime)) {
      throw new HttpError("action.endTime must be in HH:MM format.", 400);
    }
  }
};
