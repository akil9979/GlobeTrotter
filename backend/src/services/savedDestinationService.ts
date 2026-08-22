import { HttpError } from "../types/errors.js";
import { cityService } from "./cityService.js";
import { savedDestinationRepository } from "../repositories/savedDestinationRepository.js";

export const savedDestinationService = {
  list: (userId: string) => savedDestinationRepository.list(userId),
  async save(userId: string, cityId: string) { await cityService.get(cityId); await savedDestinationRepository.save(userId, cityId); return this.list(userId); },
  async remove(userId: string, cityId: string) { if (!await savedDestinationRepository.remove(userId, cityId)) throw new HttpError("Saved destination not found.", 404); },
};
