import { expenseRepository } from "../repositories/expenseRepository.js";
import type { ExpenseInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";

export const expenseService = {
  async list(userId: string, tripId: string) { await tripService.get(userId, tripId); return expenseRepository.list(tripId, userId); },
  async create(userId: string, tripId: string, input: ExpenseInput) { await tripService.get(userId, tripId); return expenseRepository.create(tripId, input); },
  async get(userId: string, tripId: string, id: string) { const expense = await expenseRepository.findOwned(id, tripId, userId); if (!expense) throw new HttpError("Expense not found.", 404); return expense; },
  async update(userId: string, tripId: string, id: string, input: Partial<ExpenseInput>) { await this.get(userId, tripId, id); const expense = await expenseRepository.update(id, tripId, input); if (!expense) throw new HttpError("Expense not found.", 404); return expense; },
  async remove(userId: string, tripId: string, id: string) { await this.get(userId, tripId, id); await expenseRepository.remove(id, tripId); },
  async budgetSummary(userId: string, tripId: string) { await tripService.get(userId, tripId); return expenseRepository.budgetSummary(tripId); },
};
