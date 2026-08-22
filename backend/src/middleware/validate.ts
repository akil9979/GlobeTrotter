import type { RequestHandler } from "express";
import { HttpError } from "../types/errors.js";

export type RequestValidator = (request: Parameters<RequestHandler>[0]) => void;

export const validate = (validator: RequestValidator): RequestHandler => (req, _res, next) => {
  try {
    validator(req);
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError("Invalid request.", 400));
  }
};
