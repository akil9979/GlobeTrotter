import { db } from "../config/db.js";
import type { OsmPlace } from "./osmOverpassService.js";

// In-memory cache for ultra-fast lookup (12 hour TTL)
const memoryCache = new Map<string, { data: OsmPlace[]; timestamp: number }>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

let isDbTableChecked = false;

async function ensureCacheTableExists() {
  if (isDbTableChecked) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS osm_destination_cache (
        city_name VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isDbTableChecked = true;
  } catch (err) {
    console.warn("Could not create osm_destination_cache table:", err);
  }
}

export const osmCacheService = {
  async getCachedPlaces(cityName: string): Promise<OsmPlace[] | null> {
    const key = cityName.trim().toLowerCase();

    // 1. Check in-memory cache
    const memEntry = memoryCache.get(key);
    if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL_MS) {
      return memEntry.data;
    }

    // 2. Check Database cache (PostgreSQL / MongoDB)
    try {
      await ensureCacheTableExists();
      const res = await db.query(
        "SELECT data, updated_at FROM osm_destination_cache WHERE LOWER(city_name) = $1",
        [key]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const places = row.data as OsmPlace[];
        // Populate memory cache
        memoryCache.set(key, { data: places, timestamp: Date.now() });
        return places;
      }
    } catch (err) {
      console.warn("Database cache lookup error:", err);
    }

    return null;
  },

  async setCachedPlaces(cityName: string, places: OsmPlace[]): Promise<void> {
    const key = cityName.trim().toLowerCase();

    // 1. Store in memory cache
    memoryCache.set(key, { data: places, timestamp: Date.now() });

    // 2. Store in Database cache
    try {
      await ensureCacheTableExists();
      const jsonStr = JSON.stringify(places);
      await db.query(
        `INSERT INTO osm_destination_cache (city_name, data, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (city_name)
         DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
        [key, jsonStr]
      );
    } catch (err) {
      console.warn("Database cache write error:", err);
    }
  },
};
