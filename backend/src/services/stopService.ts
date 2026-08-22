import { stopRepository } from "../repositories/stopRepository.js";
import type { ReorderItem, StopInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";

const assertSameIds = (existing: string[], items: ReorderItem[]): void => {
  if (existing.length !== items.length || existing.some((id) => !items.some((item) => item.id === id))) {
    throw new HttpError("Reorder requests must include every item in the trip exactly once.", 400);
  }
};

export const stopService = {
  async list(userId: string, tripId: string) { await tripService.get(userId, tripId); return stopRepository.list(tripId, userId); },
  async create(userId: string, tripId: string, input: StopInput) { await tripService.get(userId, tripId); const created = await stopRepository.create(tripId, input); return this.get(userId, tripId, created.id); },
  async get(userId: string, tripId: string, stopId: string) { const stop = await stopRepository.findOwned(stopId, tripId, userId); if (!stop) throw new HttpError("Trip stop not found.", 404); return stop; },
  async update(userId: string, tripId: string, stopId: string, input: Partial<StopInput>) { await this.get(userId, tripId, stopId); await stopRepository.update(stopId, tripId, input); return this.get(userId, tripId, stopId); },
  async remove(userId: string, tripId: string, stopId: string) { await this.get(userId, tripId, stopId); await stopRepository.remove(stopId, tripId); },
  async reorder(userId: string, tripId: string, items: ReorderItem[]) { const stops = await this.list(userId, tripId); assertSameIds(stops.map((stop) => stop.id), items); await stopRepository.reorder(tripId, items); return this.list(userId, tripId); },
};
