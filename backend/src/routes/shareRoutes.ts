import { Router } from "express";
import { copySharedTrip, createShare, getSharedTrip, revokeShare } from "../controllers/shareController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";

export const tripShareRouter = Router({ mergeParams: true });
tripShareRouter.post("/", authenticate, validate(requireParamUuid("tripId")), asyncHandler(createShare));
tripShareRouter.delete("/", authenticate, validate(requireParamUuid("tripId")), asyncHandler(revokeShare));

export const publicShareRouter = Router();
publicShareRouter.get("/:shareToken", asyncHandler(getSharedTrip));
publicShareRouter.post("/:shareToken/copy", authenticate, asyncHandler(copySharedTrip));
