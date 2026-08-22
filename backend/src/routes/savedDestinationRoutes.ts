import { Router } from "express";
import { listSavedDestinations, removeSavedDestination, saveDestination } from "../controllers/savedDestinationController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { requireParamUuid } from "../validators/common.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const savedDestinationRouter = Router();
savedDestinationRouter.use(authenticate);
savedDestinationRouter.get("/", asyncHandler(listSavedDestinations));
savedDestinationRouter.post("/:cityId", validate(requireParamUuid("cityId")), asyncHandler(saveDestination));
savedDestinationRouter.delete("/:cityId", validate(requireParamUuid("cityId")), asyncHandler(removeSavedDestination));
