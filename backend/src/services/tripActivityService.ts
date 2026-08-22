import { tripActivityRepository } from "../repositories/tripActivityRepository.js";
import type { ReorderItem, TripActivityInput } from "../types/api.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";
import { stopService } from "./stopService.js";
import { cityService } from "./cityService.js";

const assertDateInRange = (date: string, startDate: string, endDate: string, message: string): void => {
  if (date < startDate || date > endDate) throw new HttpError(message, 400);
};

export const tripActivityService = {
  async list(userId: string, tripId: string) { await tripService.get(userId, tripId); return tripActivityRepository.list(tripId, userId); },
  async validateSchedule(userId: string, tripId: string, input: TripActivityInput, excludedId?: string) {
    const [trip, stop, activity] = await Promise.all([
      tripService.get(userId, tripId),
      stopService.get(userId, tripId, input.tripStopId),
      cityService.getActivity(input.activityId),
    ]);
    if (activity.cityId !== stop.cityId) throw new HttpError("Activity must belong to the selected trip stop's city.", 400);
    assertDateInRange(input.activityDate, stop.arrivalDate, stop.departureDate, "Activity date must fall within the selected stop's date range.");
    assertDateInRange(input.activityDate, trip.startDate, trip.endDate, "Activity date must fall within the trip date range.");
    if (input.status !== "cancelled" && input.startTime && input.endTime) {
      const conflicts = await tripActivityRepository.findOverlaps(tripId, input.activityDate, input.startTime, input.endTime, excludedId);
      if (conflicts.length) throw new HttpError("Scheduled activity overlaps an existing activity.", 409, { conflicts });
    }
  },
  async create(userId: string, tripId: string, input: TripActivityInput) {
    await this.validateSchedule(userId, tripId, input);
    const created = await tripActivityRepository.create(tripId, input);
    return this.get(userId, tripId, created.id);
  },
  async get(userId: string, tripId: string, id: string) { const activity = await tripActivityRepository.findOwned(id, tripId, userId); if (!activity) throw new HttpError("Scheduled activity not found.", 404); return activity; },
  async update(userId: string, tripId: string, id: string, input: Partial<TripActivityInput>) {
    const existing = await this.get(userId, tripId, id);
    const schedule: TripActivityInput = {
      tripStopId: input.tripStopId ?? existing.tripStopId,
      activityId: input.activityId ?? existing.activityId,
      activityDate: input.activityDate ?? existing.activityDate,
      startTime: input.startTime === undefined ? existing.startTime : input.startTime,
      endTime: input.endTime === undefined ? existing.endTime : input.endTime,
      customCost: input.customCost === undefined ? existing.customCost : input.customCost,
      status: input.status ?? existing.status,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      notes: input.notes === undefined ? existing.notes : input.notes,
    };
    await this.validateSchedule(userId, tripId, schedule, id);
    await tripActivityRepository.update(id, tripId, input);
    return this.get(userId, tripId, id);
  },
  async remove(userId: string, tripId: string, id: string) { await this.get(userId, tripId, id); await tripActivityRepository.remove(id, tripId); },
  async reorder(userId: string, tripId: string, items: ReorderItem[]) {
    await tripService.get(userId, tripId); const existing = (await tripActivityRepository.listIds(tripId)).map((row) => row.id);
    if (existing.length !== items.length || existing.some((id) => !items.some((item) => item.id === id))) throw new HttpError("Reorder requests must include every scheduled activity exactly once.", 400);
    await tripActivityRepository.reorder(tripId, items);
  },
};
