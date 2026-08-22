import type { RequestHandler } from "express";
import { cityService } from "../services/cityService.js";
import { routeParam } from "../utils/requestValues.js";

const text = (value: unknown): string => typeof value === "string" ? value : "";
const number = (value: unknown): number | undefined => value === undefined ? undefined : Number(value);

export const searchActivities: RequestHandler = async (req, res) => {
  const activities = await cityService.searchActivities({
    cityId: typeof req.query.city === "string" ? req.query.city : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    search: text(req.query.search ?? req.query.q),
    minCost: number(req.query.minCost), maxCost: number(req.query.maxCost),
    minDuration: number(req.query.minDuration), maxDuration: number(req.query.maxDuration),
    limit: req.query.limit === undefined ? 20 : Number(req.query.limit),
  });
  res.json({ activities });
};

export const getCatalogActivity: RequestHandler = async (req, res) => {
  res.json({ activity: await cityService.getActivity(routeParam(req, "activityId")) });
};
