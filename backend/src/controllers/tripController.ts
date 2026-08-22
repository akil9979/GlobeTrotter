import type { RequestHandler } from "express";
import { tripService } from "../services/tripService.js";
import type { TripInput } from "../types/api.js";
import { routeParam } from "../utils/requestValues.js";

export const createTrip: RequestHandler = async (req, res) => { const trip = await tripService.create(req.userId!, req.body as TripInput); res.status(201).json({ trip }); };
export const listTrips: RequestHandler = async (req, res) => { res.json({ trips: await tripService.list(req.userId!) }); };
export const getTrip: RequestHandler = async (req, res) => { res.json({ trip: await tripService.get(req.userId!, routeParam(req, "tripId"), req.query.includeStops === "true") }); };
export const updateTrip: RequestHandler = async (req, res) => { res.json({ trip: await tripService.update(req.userId!, routeParam(req, "tripId"), req.body as Partial<TripInput>) }); };
export const deleteTrip: RequestHandler = async (req, res) => { await tripService.remove(req.userId!, routeParam(req, "tripId")); res.status(204).send(); };
export const getDashboard: RequestHandler = async (req, res) => { res.json({ dashboard: await tripService.dashboard(req.userId!) }); };
