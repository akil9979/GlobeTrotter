import type { RequestHandler } from "express";
import { db } from "../config/db.js";
import { cityService } from "../services/cityService.js";
import { viatorService } from "../services/viatorService.js";
import { osmOverpassService } from "../services/osmOverpassService.js";
import { osmCacheService } from "../services/osmCacheService.js";
import { routeParam } from "../utils/requestValues.js";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

function getRealisticCostAndDetails(category: string, subcategory: string, name: string) {
  const nameLower = name.toLowerCase();
  const subLower = subcategory.toLowerCase();
  const catLower = category.toLowerCase();

  if (
    nameLower.includes("scuba") ||
    nameLower.includes("water sport") ||
    nameLower.includes("safari") ||
    nameLower.includes("jet ski") ||
    nameLower.includes("cruise") ||
    nameLower.includes("diving")
  ) {
    return { cost: 2200, duration: "180 mins", durationMinutes: 180, image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80" };
  }
  if (catLower === "historical" || subLower.includes("fort") || subLower.includes("castle") || subLower.includes("monument")) {
    return { cost: 300, duration: "120 mins", durationMinutes: 120, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80" };
  }
  if (subLower.includes("beach") || nameLower.includes("beach")) {
    return { cost: 150, duration: "150 mins", durationMinutes: 150, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" };
  }
  if (catLower === "nature" || subLower.includes("waterfall") || subLower.includes("viewpoint") || subLower.includes("park")) {
    return { cost: 250, duration: "90 mins", durationMinutes: 90, image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" };
  }
  if (catLower === "religious" || subLower.includes("worship") || subLower.includes("church") || subLower.includes("temple")) {
    return { cost: 100, duration: "60 mins", durationMinutes: 60, image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80" };
  }
  return { cost: 500, duration: "120 mins", durationMinutes: 120, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80" };
}

/**
 * Upserts an OSM activity into the activities table for a given city,
 * returning a proper UUID that the backend validators accept.
 */
async function upsertOsmActivity(params: {
  cityName: string;
  name: string;
  category: string;
  description: string;
  image: string;
  durationMinutes: number;
  estimatedCost: number;
}): Promise<string | null> {
  try {
    // Find the city by name
    const cityRes = await db.query<{ id: string }>(
      `SELECT id FROM cities WHERE lower(name) = lower($1) LIMIT 1`,
      [params.cityName]
    );
    if (!cityRes.rows.length) return null;
    const cityId = cityRes.rows[0].id;

    // Upsert activity (insert if not exists, return existing id if duplicate)
    const actRes = await db.query<{ id: string }>(
      `INSERT INTO activities (city_id, name, category, description, image, duration_minutes, estimated_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (city_id, name) DO UPDATE SET
         description = EXCLUDED.description,
         image = EXCLUDED.image,
         duration_minutes = EXCLUDED.duration_minutes,
         estimated_cost = EXCLUDED.estimated_cost
       RETURNING id`,
      [cityId, params.name, params.category, params.description, params.image, params.durationMinutes, params.estimatedCost]
    );
    return actRes.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export const searchActivities: RequestHandler = async (req, res) => {
  const cityQuery = typeof req.query.city === "string" ? req.query.city.trim() : "";
  const searchQuery = text(req.query.search ?? req.query.q).trim();
  const targetCityName = cityQuery || searchQuery;

  const results: any[] = [];

  // 1. Seeded / DB activities for city (always have valid UUIDs)
  try {
    const localDbActivities = await cityService.searchActivities({ search: targetCityName, limit: 15 });
    for (const act of localDbActivities) {
      results.push({
        id: act.id,
        name: act.name,
        description: act.description,
        image: act.image,
        thumbnail: act.image,
        category: act.category || "attraction",
        subcategory: "local",
        duration: act.durationMinutes ? `${act.durationMinutes} mins` : "120 mins",
        durationMinutes: act.durationMinutes || 120,
        cost: act.estimatedCost ? Number(act.estimatedCost) : 500,
        estimatedCost: act.estimatedCost ? Number(act.estimatedCost) : 500,
        rating: 4.8,
        totalReviews: 140,
        source: "local",
      });
    }
  } catch (err) {
    console.warn("Local activities search error:", err);
  }

  // 2. Viator live activities (if API key available)
  if (targetCityName && !isUuid(targetCityName) && process.env.VIATOR_API_KEY) {
    try {
      const viatorResults = await viatorService.fetchActivitiesByCity(targetCityName, 15);
      if (viatorResults?.length) results.push(...viatorResults);
    } catch (err) {
      console.warn("Viator search error:", err);
    }
  }

  // 3. OpenStreetMap places — upserted into DB so they get real UUIDs
  if (targetCityName && !isUuid(targetCityName)) {
    try {
      let places = await osmCacheService.getCachedPlaces(targetCityName);
      if (!places || places.length === 0) {
        places = await osmOverpassService.fetchPlacesFromOverpass(targetCityName);
        if (places?.length) await osmCacheService.setCachedPlaces(targetCityName, places);
      }

      if (places?.length) {
        // Upsert all OSM places in parallel (max 20)
        await Promise.all(
          places.slice(0, 20).map(async (p) => {
            const defaults = getRealisticCostAndDetails(p.category, p.subcategory, p.name);
            const uuid = await upsertOsmActivity({
              cityName: targetCityName,
              name: p.name,
              category: p.category,
              description: p.description || `${p.name} — a popular ${p.subcategory.replace(/_/g, " ")} attraction in ${targetCityName}.`,
              image: p.image || defaults.image,
              durationMinutes: defaults.durationMinutes,
              estimatedCost: defaults.cost,
            });

            if (!uuid) return; // skip if city not in DB

            // Avoid duplicates with already-seeded local activities
            const alreadyListed = results.some((r) => r.name.toLowerCase().trim() === p.name.toLowerCase().trim());
            if (alreadyListed) return;

            results.push({
              id: uuid, // ← real UUID, backend accepts it
              name: p.name,
              description: p.description || `${p.name} — a popular ${p.subcategory.replace(/_/g, " ")} attraction in ${targetCityName}.`,
              image: p.image || defaults.image,
              thumbnail: p.image || defaults.image,
              category: p.category,
              subcategory: p.subcategory,
              latitude: p.latitude,
              longitude: p.longitude,
              website: p.website,
              openingHours: p.openingHours,
              duration: defaults.duration,
              durationMinutes: defaults.durationMinutes,
              cost: defaults.cost,
              estimatedCost: defaults.cost,
              entryFee: `₹${defaults.cost}`,
              rating: 4.6,
              totalReviews: 85,
              source: "openstreetmap",
            });
          })
        );
      }
    } catch (err) {
      console.warn("OSM search error:", err);
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  const finalActivities = results.filter((item) => {
    const key = item.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 25;
  res.json({
    activities: finalActivities.slice(0, limit),
    totalCount: finalActivities.length,
    source: finalActivities[0]?.source || "local",
  });
};

export const getCatalogActivity: RequestHandler = async (req, res) => {
  res.json({ activity: await cityService.getActivity(routeParam(req, "activityId")) });
};
