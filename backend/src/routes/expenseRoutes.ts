import { Router } from "express";
import { addExpense, deleteExpense, listExpenses, updateExpense } from "../controllers/expenseController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireParamUuid } from "../validators/common.js";
import { validateExpenseCreate, validateExpenseUpdate } from "../validators/apiValidators.js";

export const expenseRouter = Router({ mergeParams: true });
expenseRouter.use(authenticate, validate(requireParamUuid("tripId")));
expenseRouter.get("/", asyncHandler(listExpenses));
expenseRouter.post("/", validate(validateExpenseCreate), asyncHandler(addExpense));
expenseRouter.put("/:expenseId", validate(requireParamUuid("expenseId")), validate(validateExpenseUpdate), asyncHandler(updateExpense));
expenseRouter.delete("/:expenseId", validate(requireParamUuid("expenseId")), asyncHandler(deleteExpense));
