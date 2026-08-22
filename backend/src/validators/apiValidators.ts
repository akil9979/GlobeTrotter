import type { Request } from "express";
import { HttpError } from "../types/errors.js";
import { optionalString, requireDate, requireNumber, requirePositiveInteger, requireString, requireUuid } from "./common.js";

const body = (request: Request): Record<string, unknown> => request.body as Record<string, unknown>;
const optionalBoolean = (value: unknown, field: string): void => {
  if (value !== undefined && typeof value !== "boolean") throw new HttpError(`${field} must be a boolean.`, 400);
};
const optionalNonNegativeNumber = (value: unknown, field: string): void => {
  if (value !== undefined && value !== null && requireNumber(value, field) < 0) throw new HttpError(`${field} cannot be negative.`, 400);
};
const validateTimes = (input: Record<string, unknown>): void => {
  optionalString(input.startTime, "startTime");
  optionalString(input.endTime, "endTime");
  if ((input.startTime === undefined) !== (input.endTime === undefined)) throw new HttpError("startTime and endTime must be provided together.", 400);
  for (const field of ["startTime", "endTime"]) if (input[field] !== undefined && input[field] !== null && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(input[field]))) throw new HttpError(`${field} must use HH:MM format.`, 400);
  if (typeof input.startTime === "string" && typeof input.endTime === "string" && input.endTime <= input.startTime) {
    throw new HttpError("endTime must be later than startTime.", 400);
  }
};

export const validateTripCreate = (request: Request): void => {
  const input = body(request);
  requireString(input.name, "name");
  requireDate(input.startDate, "startDate");
  requireDate(input.endDate, "endDate");
  if (String(input.endDate) < String(input.startDate)) throw new HttpError("endDate cannot precede startDate.", 400);
  optionalString(input.description, "description"); optionalString(input.coverImage, "coverImage");
  optionalNonNegativeNumber(input.budget, "budget"); optionalBoolean(input.isPublic, "isPublic");
};

export const validateTripUpdate = (request: Request): void => {
  const input = body(request);
  if (Object.keys(input).length === 0) throw new HttpError("At least one trip field is required.", 400);
  if (input.name !== undefined) requireString(input.name, "name");
  if (input.startDate !== undefined) requireDate(input.startDate, "startDate");
  if (input.endDate !== undefined) requireDate(input.endDate, "endDate");
  if (input.startDate !== undefined && input.endDate !== undefined && String(input.endDate) < String(input.startDate)) throw new HttpError("endDate cannot precede startDate.", 400);
  optionalString(input.description, "description"); optionalString(input.coverImage, "coverImage");
  optionalNonNegativeNumber(input.budget, "budget"); optionalBoolean(input.isPublic, "isPublic");
};

export const validateTripDetailQuery = (request: Request): void => {
  if (request.query.includeStops !== undefined && request.query.includeStops !== "true" && request.query.includeStops !== "false") {
    throw new HttpError("includeStops must be true or false.", 400);
  }
};

export const validateStopCreate = (request: Request): void => {
  const input = body(request);
  requireUuid(input.cityId, "cityId"); requirePositiveInteger(input.stopOrder, "stopOrder");
  requireDate(input.arrivalDate, "arrivalDate"); requireDate(input.departureDate, "departureDate");
  if (String(input.departureDate) < String(input.arrivalDate)) throw new HttpError("departureDate cannot precede arrivalDate.", 400);
  optionalString(input.notes, "notes");
};

export const validateStopUpdate = (request: Request): void => {
  const input = body(request);
  if (Object.keys(input).length === 0) throw new HttpError("At least one stop field is required.", 400);
  if (input.cityId !== undefined) requireUuid(input.cityId, "cityId");
  if (input.stopOrder !== undefined) requirePositiveInteger(input.stopOrder, "stopOrder");
  if (input.arrivalDate !== undefined) requireDate(input.arrivalDate, "arrivalDate");
  if (input.departureDate !== undefined) requireDate(input.departureDate, "departureDate");
  if (input.arrivalDate !== undefined && input.departureDate !== undefined && String(input.departureDate) < String(input.arrivalDate)) throw new HttpError("departureDate cannot precede arrivalDate.", 400);
  optionalString(input.notes, "notes");
};

export const validateTripActivityCreate = (request: Request): void => {
  const input = body(request);
  requireUuid(input.tripStopId, "tripStopId"); requireUuid(input.activityId, "activityId"); requireDate(input.activityDate, "activityDate");
  validateTimes(input); optionalNonNegativeNumber(input.customCost, "customCost");
  if (input.status !== undefined && !["planned", "completed", "cancelled"].includes(String(input.status))) throw new HttpError("status is invalid.", 400);
  if (input.sortOrder !== undefined) requirePositiveInteger(input.sortOrder, "sortOrder"); optionalString(input.notes, "notes");
};

export const validateTripActivityUpdate = (request: Request): void => {
  const input = body(request);
  if (Object.keys(input).length === 0) throw new HttpError("At least one scheduled activity field is required.", 400);
  if (input.tripStopId !== undefined) requireUuid(input.tripStopId, "tripStopId");
  if (input.activityId !== undefined) requireUuid(input.activityId, "activityId");
  if (input.activityDate !== undefined) requireDate(input.activityDate, "activityDate");
  validateTimes(input); optionalNonNegativeNumber(input.customCost, "customCost");
  if (input.status !== undefined && !["planned", "completed", "cancelled"].includes(String(input.status))) throw new HttpError("status is invalid.", 400);
  if (input.sortOrder !== undefined) requirePositiveInteger(input.sortOrder, "sortOrder"); optionalString(input.notes, "notes");
};

export const validateExpenseCreate = (request: Request): void => {
  const input = body(request);
  if (input.tripStopId !== undefined && input.tripStopId !== null) requireUuid(input.tripStopId, "tripStopId");
  if (!["transport", "accommodation", "activity", "meal", "other"].includes(String(input.category))) throw new HttpError("category is invalid.", 400);
  if (requireNumber(input.amount, "amount") < 0) throw new HttpError("amount cannot be negative.", 400);
  requireDate(input.expenseDate, "expenseDate"); optionalString(input.description, "description");
};

export const validateExpenseUpdate = (request: Request): void => {
  const input = body(request);
  if (Object.keys(input).length === 0) throw new HttpError("At least one expense field is required.", 400);
  if (input.tripStopId !== undefined && input.tripStopId !== null) requireUuid(input.tripStopId, "tripStopId");
  if (input.category !== undefined && !["transport", "accommodation", "activity", "meal", "other"].includes(String(input.category))) throw new HttpError("category is invalid.", 400);
  if (input.amount !== undefined && requireNumber(input.amount, "amount") < 0) throw new HttpError("amount cannot be negative.", 400);
  if (input.expenseDate !== undefined) requireDate(input.expenseDate, "expenseDate"); optionalString(input.description, "description");
};

export const validateReorder = (request: Request): void => {
  const items = body(request).items;
  if (!Array.isArray(items) || items.length === 0) throw new HttpError("items must be a non-empty array.", 400);
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") throw new HttpError("Each item must be an object.", 400);
    const entry = item as Record<string, unknown>; const id = requireUuid(entry.id, "items[].id"); requirePositiveInteger(entry.order, "items[].order");
    if (ids.has(id)) throw new HttpError("Each reordered item must be unique.", 400);
    ids.add(id);
  }
};

export const validateSearchQuery = (request: Request): void => {
  for (const field of ["q", "search", "country", "region"]) if (request.query[field] !== undefined && typeof request.query[field] !== "string") throw new HttpError(`${field} must be a string.`, 400);
  if (request.query.limit !== undefined && (!/^\d+$/.test(String(request.query.limit)) || Number(request.query.limit) < 1 || Number(request.query.limit) > 100)) throw new HttpError("limit must be an integer between 1 and 100.", 400);
  for (const field of ["minCostIndex", "maxCostIndex"]) if (request.query[field] !== undefined && (!Number.isFinite(Number(request.query[field])) || Number(request.query[field]) < 0)) throw new HttpError(`${field} must be a non-negative number.`, 400);
  if (request.query.minCostIndex !== undefined && request.query.maxCostIndex !== undefined && Number(request.query.minCostIndex) > Number(request.query.maxCostIndex)) throw new HttpError("minCostIndex cannot exceed maxCostIndex.", 400);
};

export const validateActivitySearchQuery = (request: Request): void => {
  for (const field of ["q", "search", "category"]) if (request.query[field] !== undefined && typeof request.query[field] !== "string") throw new HttpError(`${field} must be a string.`, 400);
  if (request.query.city !== undefined) requireUuid(request.query.city, "city");
  if (request.query.limit !== undefined && (!/^\d+$/.test(String(request.query.limit)) || Number(request.query.limit) < 1 || Number(request.query.limit) > 100)) throw new HttpError("limit must be an integer between 1 and 100.", 400);
  for (const field of ["minCost", "maxCost", "minDuration", "maxDuration"]) if (request.query[field] !== undefined && (!Number.isFinite(Number(request.query[field])) || Number(request.query[field]) < 0)) throw new HttpError(`${field} must be a non-negative number.`, 400);
  if (request.query.minCost !== undefined && request.query.maxCost !== undefined && Number(request.query.minCost) > Number(request.query.maxCost)) throw new HttpError("minCost cannot exceed maxCost.", 400);
  if (request.query.minDuration !== undefined && request.query.maxDuration !== undefined && Number(request.query.minDuration) > Number(request.query.maxDuration)) throw new HttpError("minDuration cannot exceed maxDuration.", 400);
};

const validateEmail = (value: unknown): void => {
  const email = requireString(value, "email").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError("email must be valid.", 400);
};

const validatePassword = (value: unknown): void => {
  if (requireString(value, "password").length < 8) throw new HttpError("password must be at least 8 characters.", 400);
};

export const validateRegistration = (request: Request): void => {
  requireString(body(request).name, "name");
  validateEmail(body(request).email);
  validatePassword(body(request).password);
};

export const validateLogin = (request: Request): void => {
  validateEmail(body(request).email);
  validatePassword(body(request).password);
};

export const validateUserUpdate = (request: Request): void => {
  const input = body(request);
  if (Object.keys(input).length === 0) throw new HttpError("At least one profile field is required.", 400);
  if (input.name !== undefined) requireString(input.name, "name");
  if (input.email !== undefined) validateEmail(input.email);
  if (input.profileImage !== undefined && input.profileImage !== null) optionalString(input.profileImage, "profileImage");
  if (input.language !== undefined && (typeof input.language !== "string" || !/^[a-z]{2,10}$/i.test(input.language))) throw new HttpError("language must be a valid language code.", 400);
};
