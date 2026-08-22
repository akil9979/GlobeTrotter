import { Router } from "express";
import { getItinerary } from "../controllers/itineraryController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";

export const itineraryRouter = Router({ mergeParams: true });
itineraryRouter.get("/", authenticate, validate(requireParamUuid("tripId")), asyncHandler(getItinerary));
