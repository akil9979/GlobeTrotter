import { Router } from "express";
import {
  applyRecommendation,
  generateRecommendation,
  validateRecommendation,
} from "../controllers/aiOptimizerController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  validateOptimizerApplyInput,
  validateOptimizerGenerateInput,
} from "../validators/aiOptimizerValidators.js";

export const aiOptimizerRouter = Router();

aiOptimizerRouter.use(authenticate);

aiOptimizerRouter.post(
  "/generate",
  validate(validateOptimizerGenerateInput),
  asyncHandler(generateRecommendation)
);

aiOptimizerRouter.post(
  "/apply",
  validate(validateOptimizerApplyInput),
  asyncHandler(applyRecommendation)
);

aiOptimizerRouter.post(
  "/validate",
  asyncHandler(validateRecommendation)
);
