import { stopRepository } from "../repositories/stopRepository.js";
import type { ReorderItem, StopInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";
import { cityService } from "./cityService.js";

const assertSameIds = (existing: string[], items: ReorderItem[]): void => {
  if (existing.length !== items.length || existing.some((id) => !items.some((item) => item.id === id))) {
    throw new HttpError("Reorder requests must include every item in the trip exactly once.", 400);
  }
  const orders = items.map((item) => item.order).sort((left, right) => left - right);
  if (orders.some((order, index) => order !== index + 1)) throw new HttpError("Stop order must be consecutive, starting at 1.", 400);
};

const assertWithinTripDates = (trip: { startDate: string; endDate: string }, arrivalDate: string, departureDate: string): void => {
  if (arrivalDate < trip.startDate || departureDate > trip.endDate) throw new HttpError("Stop dates must fall within the trip date range.", 400);
};

export const stopService = {
  async list(userId: string, tripId: string) { await tripService.get(userId, tripId); return stopRepository.list(tripId, userId); },
  async create(userId: string, tripId: string, input: StopInput) {
    const trip = await tripService.get(userId, tripId);
    await cityService.get(input.cityId);
    assertWithinTripDates(trip, input.arrivalDate, input.departureDate);
    const created = await stopRepository.create(tripId, input);
    return this.get(userId, tripId, created.id);
  },
  async get(userId: string, tripId: string, stopId: string) { const stop = await stopRepository.findOwned(stopId, tripId, userId); if (!stop) throw new HttpError("Trip stop not found.", 404); return stop; },
  async update(userId: string, tripId: string, stopId: string, input: Partial<StopInput>) {
    const [trip, existing] = await Promise.all([tripService.get(userId, tripId), this.get(userId, tripId, stopId)]);
    if (input.cityId) await cityService.get(input.cityId);
    assertWithinTripDates(trip, input.arrivalDate ?? existing.arrivalDate, input.departureDate ?? existing.departureDate);
    await stopRepository.update(stopId, tripId, input);
    return this.get(userId, tripId, stopId);
  },
  async remove(userId: string, tripId: string, stopId: string) { await this.get(userId, tripId, stopId); await stopRepository.remove(stopId, tripId); },
  async reorder(userId: string, tripId: string, items: ReorderItem[]) { const stops = await this.list(userId, tripId); assertSameIds(stops.map((stop) => stop.id), items); await stopRepository.reorder(tripId, items); return this.list(userId, tripId); },
};
