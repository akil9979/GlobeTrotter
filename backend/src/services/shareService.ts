import { shareRepository } from "../repositories/shareRepository.js";
import { HttpError } from "../types/errors.js";
import { tripService } from "./tripService.js";

export const shareService = {
  async create(userId: string, tripId: string) {
    await tripService.get(userId, tripId);
    const share = await shareRepository.create(tripId);
    return { ...share, shareUrl: `/api/shared/${share.shareToken}` };
  },
  async revoke(userId: string, tripId: string) {
    await tripService.get(userId, tripId);
    await shareRepository.revoke(tripId);
  },
  async getPublic(shareToken: string) {
    const itinerary = await shareRepository.findPublicItinerary(shareToken);
    if (!itinerary) throw new HttpError("Shared trip not found or is no longer available.", 404);
    return itinerary;
  },
  async copy(shareToken: string, userId: string) {
    const tripId = await shareRepository.copySharedTrip(shareToken, userId);
    if (!tripId) throw new HttpError("Shared trip not found or is no longer available.", 404);
    return tripService.get(userId, tripId, true);
  },
};
