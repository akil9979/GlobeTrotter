import { Router } from "express";
import {
  getSchedulingIntelligence,
  resolveSchedulingIssue,
} from "../controllers/schedulingIntelligenceController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateResolveSchedulingIssueInput } from "../validators/schedulingIntelligenceValidators.js";

export const schedulingIntelligenceRouter = Router({ mergeParams: true });

schedulingIntelligenceRouter.use(authenticate);
schedulingIntelligenceRouter.use(validate(requireParamUuid("tripId")));

schedulingIntelligenceRouter.get("/", asyncHandler(getSchedulingIntelligence));
schedulingIntelligenceRouter.post(
  "/resolve",
  validate(validateResolveSchedulingIssueInput),
  asyncHandler(resolveSchedulingIssue)
);
