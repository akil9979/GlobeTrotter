import type { RequestHandler } from "express";
import { osmOverpassService } from "../services/osmOverpassService.js";
import { osmCacheService } from "../services/osmCacheService.js";

export const getDestinationPlaces: RequestHandler = async (req, res) => {
  const rawCity = typeof req.params.city === "string" ? req.params.city : typeof req.query.city === "string" ? req.query.city : "";
  const cityName = decodeURIComponent(rawCity).trim();

  if (!cityName) {
    res.status(400).json({ error: "Destination city parameter is required." });
    return;
  }

  const categoryFilter = typeof req.query.category === "string" ? req.query.category.toLowerCase().trim() : "";
  const searchQuery = typeof req.query.search === "string" ? req.query.search.toLowerCase().trim() : typeof req.query.q === "string" ? req.query.q.toLowerCase().trim() : "";
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 30;

  // 1. Try cache
  let places = await osmCacheService.getCachedPlaces(cityName);
  let isCached = true;

  // 2. Fetch from Overpass if cache miss
  if (!places || places.length === 0) {
    isCached = false;
    places = await osmOverpassService.fetchPlacesFromOverpass(cityName);
    if (places && places.length > 0) {
      await osmCacheService.setCachedPlaces(cityName, places);
    }
  }

  // 3. Apply category and search filters
  let filtered = places || [];

  if (categoryFilter) {
    filtered = filtered.filter(
      (p) =>
        p.category.toLowerCase() === categoryFilter ||
        p.subcategory.toLowerCase() === categoryFilter
    );
  }

  if (searchQuery) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.category.toLowerCase().includes(searchQuery) ||
        p.subcategory.toLowerCase().includes(searchQuery)
    );
  }

  // 4. Return clean JSON response
  res.json({
    destination: cityName,
    places: filtered.slice(0, limit),
    totalPlacesFound: filtered.length,
    cached: isCached,
    source: "openstreetmap",
  });
};
