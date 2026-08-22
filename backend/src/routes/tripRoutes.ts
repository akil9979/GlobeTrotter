import { Router } from "express";
import { createTrip, deleteTrip, getTrip, listTrips, updateTrip } from "../controllers/tripController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { requireParamUuid } from "../validators/common.js";
import { validateTripCreate, validateTripUpdate } from "../validators/apiValidators.js";

export const tripRouter = Router();
tripRouter.use(authenticate);
tripRouter.get("/", asyncHandler(listTrips));
tripRouter.post("/", validate(validateTripCreate), asyncHandler(createTrip));
tripRouter.get("/:tripId", validate(requireParamUuid("tripId")), asyncHandler(getTrip));
tripRouter.patch("/:tripId", validate(requireParamUuid("tripId")), validate(validateTripUpdate), asyncHandler(updateTrip));
tripRouter.delete("/:tripId", validate(requireParamUuid("tripId")), asyncHandler(deleteTrip));
