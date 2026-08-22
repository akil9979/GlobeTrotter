import { activityRepository } from "../repositories/activityRepository.js";
import { cityRepository } from "../repositories/cityRepository.js";
import { HttpError } from "../types/errors.js";
import type { CitySearchParams } from "../types/api.js";
import type { ActivitySearchParams } from "../types/api.js";

export const cityService = {
  search: (params: CitySearchParams) => cityRepository.search(params),
  async get(cityId: string) {
    const city = await cityRepository.findById(cityId);
    if (!city) throw new HttpError("City not found.", 404);
    return city;
  },
  searchActivities: (params: ActivitySearchParams) => activityRepository.search(params),
  async getActivity(activityId: string) {
    const activity = await activityRepository.findById(activityId);
    if (!activity) throw new HttpError("Activity not found.", 404);
    return activity;
  },
};
