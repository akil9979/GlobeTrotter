import type { RequestHandler } from "express";
import { verifyAccessToken } from "../config/jwt.js";
import { HttpError } from "../types/errors.js";

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError("Authentication token is required.", 401));
    return;
  }

  try {
    const payload = verifyAccessToken(authorization.slice("Bearer ".length));
    req.userId = payload.userId;
    req.authenticatedUser = { id: payload.userId, email: payload.email };
    next();
  } catch {
    next(new HttpError("Invalid or expired authentication token.", 401));
  }
};
