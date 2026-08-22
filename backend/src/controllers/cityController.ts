import type { RequestHandler } from "express";
import { cityService } from "../services/cityService.js";
import { routeParam } from "../utils/requestValues.js";

const limit = (value: unknown): number => value === undefined ? 20 : Number(value);
const query = (value: unknown): string => typeof value === "string" ? value : "";
const optionalNumber = (value: unknown): number | undefined => value === undefined ? undefined : Number(value);
const citySearchParams = (req: Parameters<RequestHandler>[0]) => ({
  search: query(req.query.search ?? req.query.q),
  country: typeof req.query.country === "string" ? req.query.country : undefined,
  region: typeof req.query.region === "string" ? req.query.region : undefined,
  minCostIndex: optionalNumber(req.query.minCostIndex),
  maxCostIndex: optionalNumber(req.query.maxCostIndex),
  limit: limit(req.query.limit),
});

export const searchCities: RequestHandler = async (req, res) => { res.json({ cities: await cityService.search(citySearchParams(req)) }); };
export const getCity: RequestHandler = async (req, res) => { res.json({ city: await cityService.get(routeParam(req, "cityId")) }); };
export const searchActivitiesByCity: RequestHandler = async (req, res) => { res.json({ activities: await cityService.searchActivities({ cityId: routeParam(req, "cityId"), search: query(req.query.search ?? req.query.q), limit: limit(req.query.limit) }) }); };
export const getActivity: RequestHandler = async (req, res) => { res.json({ activity: await cityService.getActivity(routeParam(req, "activityId")) }); };
