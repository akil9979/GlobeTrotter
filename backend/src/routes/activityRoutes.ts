import { Router } from "express";
import { getCatalogActivity, searchActivities } from "../controllers/activityController.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateActivitySearchQuery } from "../validators/apiValidators.js";

export const activityRouter = Router();
activityRouter.get("/", validate(validateActivitySearchQuery), asyncHandler(searchActivities));
activityRouter.get("/search", validate(validateActivitySearchQuery), asyncHandler(searchActivities));
activityRouter.get("/:activityId", validate(requireParamUuid("activityId")), asyncHandler(getCatalogActivity));
