import type { RequestHandler } from "express";
import { savedDestinationService } from "../services/savedDestinationService.js";
import { routeParam } from "../utils/requestValues.js";

export const listSavedDestinations: RequestHandler = async (req, res) => { res.json({ destinations: await savedDestinationService.list(req.userId!) }); };
export const saveDestination: RequestHandler = async (req, res) => { res.status(201).json({ destinations: await savedDestinationService.save(req.userId!, routeParam(req, "cityId")) }); };
export const removeSavedDestination: RequestHandler = async (req, res) => { await savedDestinationService.remove(req.userId!, routeParam(req, "cityId")); res.status(204).send(); };
