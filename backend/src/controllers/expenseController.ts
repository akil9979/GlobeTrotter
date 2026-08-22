import type { RequestHandler } from "express";
import { expenseService } from "../services/expenseService.js";
import type { ExpenseInput } from "../types/api.js";
import { routeParam } from "../utils/requestValues.js";

export const listExpenses: RequestHandler = async (req, res) => { res.json({ expenses: await expenseService.list(req.userId!, routeParam(req, "tripId")) }); };
export const addExpense: RequestHandler = async (req, res) => { const expense = await expenseService.create(req.userId!, routeParam(req, "tripId"), req.body as ExpenseInput); res.status(201).json({ expense }); };
export const updateExpense: RequestHandler = async (req, res) => { res.json({ expense: await expenseService.update(req.userId!, routeParam(req, "tripId"), routeParam(req, "expenseId"), req.body as Partial<ExpenseInput>) }); };
export const deleteExpense: RequestHandler = async (req, res) => { await expenseService.remove(req.userId!, routeParam(req, "tripId"), routeParam(req, "expenseId")); res.status(204).send(); };
export const getBudgetSummary: RequestHandler = async (req, res) => { res.json({ budgetSummary: await expenseService.budgetSummary(req.userId!, routeParam(req, "tripId")) }); };
