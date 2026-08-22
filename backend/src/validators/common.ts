import type { Request } from "express";
import { HttpError } from "../types/errors.js";

export const requireUuid = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(`${field} must be a UUID.`, 400);
  }
  return value;
};

export const requireString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new HttpError(`${field} is required.`, 400);
  return value;
};

export const optionalString = (value: unknown, field: string): void => {
  if (value !== undefined && value !== null && typeof value !== "string") throw new HttpError(`${field} must be a string.`, 400);
};

export const requireNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(`${field} must be a number.`, 400);
  return value;
};

export const requirePositiveInteger = (value: unknown, field: string): number => {
  const number = requireNumber(value, field);
  if (!Number.isInteger(number) || number < 1) throw new HttpError(`${field} must be a positive integer.`, 400);
  return number;
};

export const requireDate = (value: unknown, field: string): string => {
  const date = requireString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new HttpError(`${field} must be an ISO date (YYYY-MM-DD).`, 400);
  }
  return date;
};

export const requireParamUuid = (paramName: string) => (req: Request): void => {
  requireUuid(req.params[paramName], paramName);
};
