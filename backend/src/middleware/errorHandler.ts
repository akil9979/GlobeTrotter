import type { ErrorRequestHandler, RequestHandler } from "express";
import type { AppError } from "../types/errors.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
  });
};

export const errorHandler: ErrorRequestHandler = (error: AppError, _req, res, _next) => {
  const databaseError = error as AppError & { code?: string };
  const statusCode = error.statusCode ?? (databaseError.code === "23505" ? 409 : databaseError.code === "23503" || databaseError.code === "23514" ? 400 : 500);

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : error.message,
  });
};
