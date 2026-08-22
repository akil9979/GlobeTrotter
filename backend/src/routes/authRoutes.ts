import { Router } from "express";
import { deleteCurrentUser, getCurrentUser, login, register, updateCurrentUser } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateLogin, validateRegistration, validateUserUpdate } from "../validators/apiValidators.js";

export const authRouter = Router();
authRouter.post("/register", validate(validateRegistration), asyncHandler(register));
authRouter.post("/login", validate(validateLogin), asyncHandler(login));
authRouter.get("/me", authenticate, asyncHandler(getCurrentUser));
authRouter.put("/me", authenticate, validate(validateUserUpdate), asyncHandler(updateCurrentUser));
authRouter.delete("/me", authenticate, asyncHandler(deleteCurrentUser));
