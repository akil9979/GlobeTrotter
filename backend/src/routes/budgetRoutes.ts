import { Router } from "express";
import { getBudgetSummary } from "../controllers/expenseController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";

export const budgetRouter = Router({ mergeParams: true });
budgetRouter.get("/", authenticate, validate(requireParamUuid("tripId")), asyncHandler(getBudgetSummary));
