import type { RequestHandler } from "express";
import { tripActivityService } from "../services/tripActivityService.js";
import type { ReorderItem, TripActivityInput } from "../types/api.js";
import { routeParam } from "../utils/requestValues.js";

export const addTripActivity: RequestHandler = async (req, res) => { const scheduledActivity = await tripActivityService.create(req.userId!, routeParam(req, "tripId"), req.body as TripActivityInput); res.status(201).json({ scheduledActivity }); };
export const updateTripActivity: RequestHandler = async (req, res) => { res.json({ scheduledActivity: await tripActivityService.update(req.userId!, routeParam(req, "tripId"), routeParam(req, "tripActivityId"), req.body as Partial<TripActivityInput>) }); };
export const deleteTripActivity: RequestHandler = async (req, res) => { await tripActivityService.remove(req.userId!, routeParam(req, "tripId"), routeParam(req, "tripActivityId")); res.status(204).send(); };
export const reorderTripActivities: RequestHandler = async (req, res) => { await tripActivityService.reorder(req.userId!, routeParam(req, "tripId"), (req.body as { items: ReorderItem[] }).items); res.status(204).send(); };
