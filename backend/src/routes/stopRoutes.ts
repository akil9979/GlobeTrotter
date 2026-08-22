import { Router } from "express";
import { addStop, deleteStop, listStops, reorderStops, updateStop } from "../controllers/stopController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateReorder, validateStopCreate, validateStopUpdate } from "../validators/apiValidators.js";

export const stopRouter = Router({ mergeParams: true });
stopRouter.use(authenticate, validate(requireParamUuid("tripId")));
stopRouter.get("/", asyncHandler(listStops));
stopRouter.post("/", validate(validateStopCreate), asyncHandler(addStop));
stopRouter.patch("/reorder", validate(validateReorder), asyncHandler(reorderStops));
stopRouter.patch("/:stopId", validate(requireParamUuid("stopId")), validate(validateStopUpdate), asyncHandler(updateStop));
stopRouter.delete("/:stopId", validate(requireParamUuid("stopId")), asyncHandler(deleteStop));
