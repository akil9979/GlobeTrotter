import type { RequestHandler } from "express";
import { itineraryService } from "../services/itineraryService.js";
import { routeParam } from "../utils/requestValues.js";

export const getItinerary: RequestHandler = async (req, res) => {
  res.json({ itinerary: await itineraryService.get(req.userId!, routeParam(req, "tripId")) });
};
