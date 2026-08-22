import { tripRepository } from "../repositories/tripRepository.js";
import type { TripInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { stopRepository } from "../repositories/stopRepository.js";

export const tripService = {
  async create(userId: string, input: TripInput) {
    const created = await tripRepository.create(userId, input);
    return this.get(userId, created.id);
  },
  list: (userId: string) => tripRepository.listByUser(userId),
  async get(userId: string, tripId: string, includeStops = false) {
    const trip = await tripRepository.findOwned(tripId, userId);
    if (!trip) throw new HttpError("Trip not found.", 404);
    return includeStops ? { ...trip, stops: await stopRepository.listByTrip(tripId) } : trip;
  },
  async update(userId: string, tripId: string, input: Partial<TripInput>) {
    await this.get(userId, tripId);
    await tripRepository.update(tripId, userId, input);
    return this.get(userId, tripId);
  },
  async remove(userId: string, tripId: string) {
    const removed = await tripRepository.remove(tripId, userId);
    if (!removed) throw new HttpError("Trip not found.", 404);
  },
  dashboard: (userId: string) => tripRepository.dashboard(userId),
};
