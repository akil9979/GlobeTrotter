import type { RequestHandler } from "express";
import { aiOptimizerService } from "../services/aiOptimizerService.js";
import type { ApplyOptimizerInput, TripOptimizerInput } from "../types/aiOptimizer.js";

export const generateRecommendation: RequestHandler = async (req, res) => {
  const result = await aiOptimizerService.generate(req.userId!, req.body as TripOptimizerInput);
  res.json({ recommendation: result });
};

export const applyRecommendation: RequestHandler = async (req, res) => {
  const result = await aiOptimizerService.apply(req.userId!, req.body as ApplyOptimizerInput);
  res.status(201).json(result);
};

export const validateRecommendation: RequestHandler = async (req, res) => {
  const result = await aiOptimizerService.validateAndMatchOutput(
    req.body.recommendation || req.body,
    {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      budget: req.body.budget,
    }
  );
  res.json({ validated: result });
};
