import type { RequestHandler } from "express";
import { stopService } from "../services/stopService.js";
import type { ReorderItem, StopInput } from "../types/api.js";
import { routeParam } from "../utils/requestValues.js";

export const listStops: RequestHandler = async (req, res) => { res.json({ stops: await stopService.list(req.userId!, routeParam(req, "tripId")) }); };
export const addStop: RequestHandler = async (req, res) => { const stop = await stopService.create(req.userId!, routeParam(req, "tripId"), req.body as StopInput); res.status(201).json({ stop }); };
export const updateStop: RequestHandler = async (req, res) => { res.json({ stop: await stopService.update(req.userId!, routeParam(req, "tripId"), routeParam(req, "stopId"), req.body as Partial<StopInput>) }); };
export const deleteStop: RequestHandler = async (req, res) => { await stopService.remove(req.userId!, routeParam(req, "tripId"), routeParam(req, "stopId")); res.status(204).send(); };
export const reorderStops: RequestHandler = async (req, res) => { res.json({ stops: await stopService.reorder(req.userId!, routeParam(req, "tripId"), (req.body as { items: ReorderItem[] }).items) }); };
