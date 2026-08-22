import type { Request } from "express";
import { HttpError } from "../types/errors.js";
import { requireNumber, requireUuid } from "./common.js";

const body = (request: Request): Record<string, unknown> => request.body as Record<string, unknown>;

export const validateApplyBudgetOptimizationInput = (request: Request): void => {
  const input = body(request);

  if (!Array.isArray(input.appliedItems) || input.appliedItems.length === 0) {
    throw new HttpError("appliedItems must be a non-empty array of optimization items to apply.", 400);
  }

  for (let i = 0; i < input.appliedItems.length; i++) {
    const item = input.appliedItems[i] as Record<string, unknown>;
    if (!item || typeof item !== "object") {
      throw new HttpError(`appliedItems[${i}] must be an object.`, 400);
    }

    if (item.targetType !== "expense" && item.targetType !== "activity") {
      throw new HttpError(`appliedItems[${i}].targetType must be either 'expense' or 'activity'.`, 400);
    }

    requireUuid(item.targetId, `appliedItems[${i}].targetId`);

    const amount = requireNumber(item.proposedAmount, `appliedItems[${i}].proposedAmount`);
    if (amount < 0) {
      throw new HttpError(`appliedItems[${i}].proposedAmount cannot be negative.`, 400);
    }
  }

  if (input.selectedRecommendationIds !== undefined && !Array.isArray(input.selectedRecommendationIds)) {
    throw new HttpError("selectedRecommendationIds must be an array of strings.", 400);
  }
};
