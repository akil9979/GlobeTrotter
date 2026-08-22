import type { RequestHandler } from "express";
import { budgetOptimizerService } from "../services/budgetOptimizerService.js";
import type { ApplyBudgetOptimizationInput } from "../types/budgetOptimizer.js";
import { routeParam } from "../utils/requestValues.js";

export const getBudgetOptimizations: RequestHandler = async (req, res) => {
  const result = await budgetOptimizerService.analyze(req.userId!, routeParam(req, "tripId"));
  res.json({ optimization: result });
};

export const applyBudgetOptimizations: RequestHandler = async (req, res) => {
  const result = await budgetOptimizerService.apply(
    req.userId!,
    routeParam(req, "tripId"),
    req.body as ApplyBudgetOptimizationInput
  );
  res.json(result);
};
