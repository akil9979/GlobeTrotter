import { activityRepository } from "../repositories/activityRepository.js";
import { cityRepository } from "../repositories/cityRepository.js";
import { HttpError } from "../types/errors.js";

export const cityService = {
  search: (query: string, limit: number) => cityRepository.search(query, limit),
  async get(cityId: string) {
    const city = await cityRepository.findById(cityId);
    if (!city) throw new HttpError("City not found.", 404);
    return city;
  },
  searchActivities: (cityId: string, query: string, limit: number) => activityRepository.searchByCity(cityId, query, limit),
  async getActivity(activityId: string) {
    const activity = await activityRepository.findById(activityId);
    if (!activity) throw new HttpError("Activity not found.", 404);
    return activity;
  },
};
