import { Router } from "express";
import {
  applyBudgetOptimizations,
  getBudgetOptimizations,
} from "../controllers/budgetOptimizerController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateApplyBudgetOptimizationInput } from "../validators/budgetOptimizerValidators.js";

export const budgetOptimizerRouter = Router({ mergeParams: true });

budgetOptimizerRouter.use(authenticate);
budgetOptimizerRouter.use(validate(requireParamUuid("tripId")));

budgetOptimizerRouter.get("/", asyncHandler(getBudgetOptimizations));
budgetOptimizerRouter.post(
  "/apply",
  validate(validateApplyBudgetOptimizationInput),
  asyncHandler(applyBudgetOptimizations)
);
