import { itineraryRepository } from "../repositories/itineraryRepository.js";
import { HttpError } from "../types/errors.js";

export const itineraryService = {
  async get(userId: string, tripId: string) {
    const itinerary = await itineraryRepository.findOwned(tripId, userId);
    if (!itinerary) throw new HttpError("Trip not found.", 404);
    return itinerary;
  },
};
