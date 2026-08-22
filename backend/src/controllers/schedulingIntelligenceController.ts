import type { RequestHandler } from "express";
import { schedulingIntelligenceService } from "../services/schedulingIntelligenceService.js";
import type { ResolveSchedulingIssueInput } from "../types/schedulingIntelligence.js";
import { routeParam } from "../utils/requestValues.js";

export const getSchedulingIntelligence: RequestHandler = async (req, res) => {
  const result = await schedulingIntelligenceService.analyze(
    req.userId!,
    routeParam(req, "tripId")
  );
  res.json({ intelligence: result });
};

export const resolveSchedulingIssue: RequestHandler = async (req, res) => {
  const body = req.body as ResolveSchedulingIssueInput;
  const result = await schedulingIntelligenceService.resolve(
    req.userId!,
    routeParam(req, "tripId"),
    body.action
  );
  res.json(result);
};
