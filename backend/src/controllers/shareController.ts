import type { RequestHandler } from "express";
import { shareService } from "../services/shareService.js";
import { routeParam } from "../utils/requestValues.js";

export const createShare: RequestHandler = async (req, res) => { res.status(201).json({ share: await shareService.create(req.userId!, routeParam(req, "tripId")) }); };
export const revokeShare: RequestHandler = async (req, res) => { await shareService.revoke(req.userId!, routeParam(req, "tripId")); res.status(204).send(); };
export const getSharedTrip: RequestHandler = async (req, res) => { res.json({ itinerary: await shareService.getPublic(routeParam(req, "shareToken")) }); };
export const copySharedTrip: RequestHandler = async (req, res) => { const trip = await shareService.copy(routeParam(req, "shareToken"), req.userId!); res.status(201).json({ trip }); };
