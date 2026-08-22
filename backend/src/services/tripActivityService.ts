import { tripActivityRepository } from "../repositories/tripActivityRepository.js";
import type { ReorderItem, TripActivityInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";

export const tripActivityService = {
  async create(userId: string, tripId: string, input: TripActivityInput) { await tripService.get(userId, tripId); const created = await tripActivityRepository.create(tripId, input); return this.get(userId, tripId, created.id); },
  async get(userId: string, tripId: string, id: string) { const activity = await tripActivityRepository.findOwned(id, tripId, userId); if (!activity) throw new HttpError("Scheduled activity not found.", 404); return activity; },
  async update(userId: string, tripId: string, id: string, input: Partial<TripActivityInput>) { await this.get(userId, tripId, id); await tripActivityRepository.update(id, tripId, input); return this.get(userId, tripId, id); },
  async remove(userId: string, tripId: string, id: string) { await this.get(userId, tripId, id); await tripActivityRepository.remove(id, tripId); },
  async reorder(userId: string, tripId: string, items: ReorderItem[]) {
    await tripService.get(userId, tripId); const existing = (await tripActivityRepository.listIds(tripId)).map((row) => row.id);
    if (existing.length !== items.length || existing.some((id) => !items.some((item) => item.id === id))) throw new HttpError("Reorder requests must include every scheduled activity exactly once.", 400);
    await tripActivityRepository.reorder(tripId, items);
  },
};
