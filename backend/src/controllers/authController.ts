import type { RequestHandler } from "express";
import { authService } from "../services/authService.js";
import type { LoginInput, RegisterInput } from "../types/auth.js";

export const register: RequestHandler = async (req, res) => {
  const auth = await authService.register(req.body as RegisterInput);
  res.status(201).json(auth);
};

export const login: RequestHandler = async (req, res) => {
  res.json(await authService.login(req.body as LoginInput));
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  res.json({ user: await authService.getCurrentUser(req.userId!) });
};

export const updateCurrentUser: RequestHandler = async (req, res) => {
  res.json({ user: await authService.updateCurrentUser(req.userId!, req.body) });
};

export const deleteCurrentUser: RequestHandler = async (req, res) => {
  await authService.removeCurrentUser(req.userId!);
  res.status(204).send();
};
