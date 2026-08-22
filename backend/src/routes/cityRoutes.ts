import { Router } from "express";
import { getCity, searchActivitiesByCity, searchCities } from "../controllers/cityController.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateSearchQuery } from "../validators/apiValidators.js";
import { validateActivitySearchQuery } from "../validators/apiValidators.js";

export const cityRouter = Router();
cityRouter.get("/cities", validate(validateSearchQuery), asyncHandler(searchCities));
cityRouter.get("/cities/search", validate(validateSearchQuery), asyncHandler(searchCities));
cityRouter.get("/cities/:cityId", validate(requireParamUuid("cityId")), asyncHandler(getCity));
cityRouter.get("/cities/:cityId/activities", validate(requireParamUuid("cityId")), validate(validateActivitySearchQuery), asyncHandler(searchActivitiesByCity));
