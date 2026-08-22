import { Router } from "express";
import { getDestinationPlaces } from "../controllers/destinationPlacesController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const destinationPlacesRouter = Router();

destinationPlacesRouter.get("/:city/places", asyncHandler(getDestinationPlaces));
destinationPlacesRouter.get("/places", asyncHandler(getDestinationPlaces));
