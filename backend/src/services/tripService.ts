import { tripRepository } from "../repositories/tripRepository.js";
import type { TripInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";

export const tripService = {
  create: (userId: string, input: TripInput) => tripRepository.create(userId, input),
  list: (userId: string) => tripRepository.listByUser(userId),
  async get(userId: string, tripId: string) {
    const trip = await tripRepository.findOwned(tripId, userId);
    if (!trip) throw new HttpError("Trip not found.", 404);
    return trip;
  },
  async update(userId: string, tripId: string, input: Partial<TripInput>) {
    await this.get(userId, tripId);
    return tripRepository.update(tripId, userId, input);
  },
  async remove(userId: string, tripId: string) {
    const removed = await tripRepository.remove(tripId, userId);
    if (!removed) throw new HttpError("Trip not found.", 404);
  },
};
