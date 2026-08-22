export type OsmPlace = {
  name: string;
  category: string;
  subcategory: string;
  latitude: number;
  longitude: number;
  description: string | null;
  image: string | null;
  website: string | null;
  openingHours: string | null;
  duration: string | null;
  entryFee: string | null;
  osmId: string;
  wikidataId: string | null;
  wikipedia: string | null;
  source: "openstreetmap";
};

type GeocodeBbox = {
  south: number;
  north: number;
  west: number;
  east: number;
  lat: number;
  lon: number;
};

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Map OSM tags to unified category and subcategory
function deriveCategories(tags: Record<string, string>): { category: string; subcategory: string } {
  if (tags.natural === "beach") return { category: "nature", subcategory: "beach" };
  if (tags.leisure === "park" || tags.leisure === "nature_reserve" || tags.leisure === "garden") {
    return { category: "nature", subcategory: tags.leisure };
  }
  if (tags.historic) {
    const sub = tags.historic === "yes" ? "historical_site" : tags.historic;
    return { category: "historical", subcategory: sub };
  }
  if (tags.tourism === "museum") return { category: "culture", subcategory: "museum" };
  if (tags.tourism === "viewpoint") return { category: "sightseeing", subcategory: "viewpoint" };
  if (tags.tourism === "artwork" || tags.tourism === "gallery") return { category: "culture", subcategory: tags.tourism };
  if (tags.tourism === "zoo" || tags.tourism === "aquarium" || tags.tourism === "theme_park") {
    return { category: "entertainment", subcategory: tags.tourism };
  }
  if (tags.tourism === "attraction") return { category: "sightseeing", subcategory: "landmark" };
  if (tags.amenity === "place_of_worship") {
    const sub = tags.religion ? `place_of_worship_${tags.religion.toLowerCase()}` : "place_of_worship";
    return { category: "religious", subcategory: sub };
  }
  if (tags.shop) return { category: "shopping", subcategory: tags.shop };
  if (tags.waterway || tags.natural === "waterfall") return { category: "nature", subcategory: "waterfall" };

  return { category: "attraction", subcategory: tags.tourism || tags.amenity || "tourist_place" };
}

export const osmOverpassService = {
  /**
   * Geocode a destination/city name using Nominatim to get bounding box coordinates
   */
  async geocodeCity(cityName: string): Promise<GeocodeBbox | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "GlobeTrotterTravelApp/1.0 (contact@globetrotter.app)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as any[];
      if (!data || data.length === 0) return null;

      const item = data[0];
      const bbox = item.boundingbox; // [south, north, west, east]
      if (Array.isArray(bbox) && bbox.length === 4) {
        return {
          south: parseFloat(bbox[0]),
          north: parseFloat(bbox[1]),
          west: parseFloat(bbox[2]),
          east: parseFloat(bbox[3]),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        };
      }

      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      return {
        south: lat - 0.15,
        north: lat + 0.15,
        west: lon - 0.15,
        east: lon + 0.15,
        lat,
        lon,
      };
    } catch (err) {
      console.warn("Nominatim geocoding error for city:", cityName, err);
      return null;
    }
  },

  /**
   * Query Overpass API for real tourist places across mirrors with timeout protection
   */
  async fetchPlacesFromOverpass(cityName: string): Promise<OsmPlace[]> {
    const bbox = await this.geocodeCity(cityName);

    let bboxFilter = "";
    if (bbox) {
      let s = bbox.south, n = bbox.north, w = bbox.west, e = bbox.east;
      // Cap box size to ~0.35 deg for speed
      if (n - s > 0.35) {
        s = bbox.lat - 0.18;
        n = bbox.lat + 0.18;
      }
      if (e - w > 0.35) {
        w = bbox.lon - 0.18;
        e = bbox.lon + 0.18;
      }
      bboxFilter = `(${s.toFixed(4)},${w.toFixed(4)},${n.toFixed(4)},${e.toFixed(4)})`;
    }

    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park|aquarium"]${bboxFilter};
        way["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park|aquarium"]${bboxFilter};
        node["historic"]${bboxFilter};
        way["historic"]${bboxFilter};
        node["natural"~"beach|waterfall"]${bboxFilter};
        way["natural"~"beach|waterfall"]${bboxFilter};
        node["leisure"~"park|nature_reserve|garden"]${bboxFilter};
        way["leisure"~"park|nature_reserve|garden"]${bboxFilter};
        node["amenity"="place_of_worship"]${bboxFilter};
        way["amenity"="place_of_worship"]${bboxFilter};
      );
      out center 50;
    `;

    // Try Overpass mirrors sequentially
    for (const mirrorUrl of OVERPASS_MIRRORS) {
      try {
        const response = await fetch(mirrorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GlobeTrotterTravelApp/1.0 (contact@globetrotter.app)",
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.warn(`Overpass mirror ${mirrorUrl} returned status ${response.status}`);
          continue;
        }

        const data = (await response.json()) as any;
        if (!data || !Array.isArray(data.elements)) continue;

        const rawPlaces: OsmPlace[] = [];
        const seenNames = new Set<string>();

        for (const el of data.elements) {
          const tags = el.tags || {};
          const name = tags.name || tags["name:en"];

          if (!name || typeof name !== "string" || name.trim().length === 0) continue;

          const cleanName = name.trim();
          const normKey = cleanName.toLowerCase();
          if (seenNames.has(normKey)) continue;
          seenNames.add(normKey);

          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (typeof lat !== "number" || typeof lon !== "number") continue;

          const { category, subcategory } = deriveCategories(tags);
          const osmId = `${el.type}/${el.id}`;
          const website = tags.website || tags["contact:website"] || tags.url || null;
          const openingHours = tags.opening_hours || null;
          const entryFee = tags.fee || tags.charge || null;
          const wikidataId = tags.wikidata || null;
          const wikipedia = tags.wikipedia || null;

          let image: string | null = tags.image || tags.wikimedia_commons || null;
          if (image && image.startsWith("File:")) {
            image = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image.replace(/^File:/, ""))}`;
          }

          rawPlaces.push({
            name: cleanName,
            category,
            subcategory,
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lon.toFixed(5)),
            description: tags.description || tags["description:en"] || null,
            image,
            website,
            openingHours,
            duration: null,
            entryFee,
            osmId,
            wikidataId,
            wikipedia,
            source: "openstreetmap",
          });
        }

        if (rawPlaces.length > 0) {
          const enriched = await this.enrichPlacesWithWikipedia(rawPlaces.slice(0, 8));
          return [...enriched, ...rawPlaces.slice(8)];
        }
      } catch (err) {
        console.warn(`Overpass fetch error on mirror ${mirrorUrl}:`, err);
      }
    }

    return [];
  },

  /**
   * Optional Wikipedia REST API enrichment for descriptions & thumbnail images
   */
  async enrichPlacesWithWikipedia(places: OsmPlace[]): Promise<OsmPlace[]> {
    return Promise.all(
      places.map(async (place) => {
        if (!place.wikipedia && !place.wikidataId) return place;

        try {
          let wikiTitle = "";
          if (place.wikipedia && place.wikipedia.includes(":")) {
            wikiTitle = place.wikipedia.split(":")[1];
          } else if (place.wikipedia) {
            wikiTitle = place.wikipedia;
          }

          if (!wikiTitle) return place;

          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
          const res = await fetch(wikiUrl, {
            headers: { "User-Agent": "GlobeTrotterApp/1.0" },
            signal: AbortSignal.timeout(1500),
          });

          if (!res.ok) return place;
          const summary = (await res.json()) as any;

          return {
            ...place,
            description: place.description || summary.extract || null,
            image: place.image || summary.thumbnail?.source || summary.originalimage?.source || null,
            wikipedia: summary.content_urls?.desktop?.page || place.wikipedia,
          };
        } catch {
          return place;
        }
      })
    );
  },
};
