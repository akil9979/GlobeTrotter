import { Router } from "express";
import { getDashboard } from "../controllers/tripController.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRouter = Router();
dashboardRouter.get("/", authenticate, asyncHandler(getDashboard));
