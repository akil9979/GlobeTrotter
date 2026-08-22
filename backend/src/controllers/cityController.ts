import type { RequestHandler } from "express";
import { cityService } from "../services/cityService.js";
import { routeParam } from "../utils/requestValues.js";

const limit = (value: unknown): number => value === undefined ? 20 : Number(value);
const query = (value: unknown): string => typeof value === "string" ? value : "";

export const searchCities: RequestHandler = async (req, res) => { res.json({ cities: await cityService.search(query(req.query.q), limit(req.query.limit)) }); };
export const getCity: RequestHandler = async (req, res) => { res.json({ city: await cityService.get(routeParam(req, "cityId")) }); };
export const searchActivitiesByCity: RequestHandler = async (req, res) => { res.json({ activities: await cityService.searchActivities(routeParam(req, "cityId"), query(req.query.q), limit(req.query.limit)) }); };
export const getActivity: RequestHandler = async (req, res) => { res.json({ activity: await cityService.getActivity(routeParam(req, "activityId")) }); };
