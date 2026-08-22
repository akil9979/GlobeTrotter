import { Router } from "express";
import { addTripActivity, deleteTripActivity, reorderTripActivities, updateTripActivity } from "../controllers/tripActivityController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateReorder, validateTripActivityCreate, validateTripActivityUpdate } from "../validators/apiValidators.js";

export const tripActivityRouter = Router({ mergeParams: true });
tripActivityRouter.use(authenticate, validate(requireParamUuid("tripId")));
tripActivityRouter.post("/", validate(validateTripActivityCreate), asyncHandler(addTripActivity));
tripActivityRouter.patch("/reorder", validate(validateReorder), asyncHandler(reorderTripActivities));
tripActivityRouter.patch("/:tripActivityId", validate(requireParamUuid("tripActivityId")), validate(validateTripActivityUpdate), asyncHandler(updateTripActivity));
tripActivityRouter.delete("/:tripActivityId", validate(requireParamUuid("tripActivityId")), asyncHandler(deleteTripActivity));
