import type { RequestHandler } from "express";
import { db } from "../config/db.js";

export const getHealth: RequestHandler = async (_req, res, next) => {
  try {
    const result = await db.query<{ now: Date }>("SELECT NOW()");

    res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    next(error);
  }
};
