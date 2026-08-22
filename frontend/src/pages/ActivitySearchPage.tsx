import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Compass, Search, Clock, ArrowLeft, Plus, MapPin, ExternalLink, Filter, Loader2 } from "lucide-react";

type Activity = {
  id: string;
  name: string;
  description: string | null;
  image?: string | null;
  thumbnail?: string | null;
  category?: string;
  subcategory?: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  openingHours?: string | null;
  duration?: string | null;
  durationMinutes?: number | null;
  cost?: number | null;
  estimatedCost?: number | null;
  entryFee?: string | null;
  source?: "openstreetmap" | "viator" | "local";
  wikipedia?: string | null;
};

const CATEGORIES = ["all", "historical", "nature", "culture", "sightseeing", "religious", "entertainment", "shopping"];

export const ActivitySearchPage = () => {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get("city") || "Goa";

  const [cityName, setCityName] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"openstreetmap" | "viator" | "local">("openstreetmap");

  // Fetch function using GET /api/destinations/:city/places or /api/activities
  const fetchActivities = (queryCity: string, category: string) => {
    if (!queryCity.trim()) return;
    setIsLoading(true);
    setIsSearching(true);
    setError(null);

    const catQuery = category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
    apiClient<{ places?: Activity[]; activities?: Activity[]; source?: "openstreetmap" | "viator" | "local" }>(
      `/destinations/${encodeURIComponent(queryCity.trim())}/places?limit=40${catQuery}`
    )
      .then((res) => {
        const items = res.places || res.activities || [];
        setActivities(items);
        setSource(res.source || "openstreetmap");
      })
      .catch(() => {
        // Fallback to /activities
        return apiClient<{ activities: Activity[]; source?: "openstreetmap" | "viator" | "local" }>(
          `/activities?city=${encodeURIComponent(queryCity.trim())}&limit=30${catQuery}`
        ).then((res) => {
          setActivities(res.activities || []);
          setSource(res.source || "local");
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setIsLoading(false);
        setIsSearching(false);
      });
  };

  // Debounced input effect: fire only after user pauses typing (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivities(cityName, selectedCategory);
    }, 300);
    return () => clearTimeout(timer);
  }, [cityName, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={tripId ? `/trips/${tripId}` : "/trips"}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trip Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                Destination POIs & Sights
              </span>
              {source === "openstreetmap" && (
                <Badge variant="sky" size="sm" className="font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                  Real OpenStreetMap Data
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Real Sights & Places in {cityName || "Selected City"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Beaches, forts, temples, museums, viewpoints, parks, and attractions from OpenStreetMap.
            </p>
          </div>

          {tripId && (
            <Link to={`/trips/${tripId}/builder`}>
              <Button variant="primary" size="md" leftIcon={<Compass className="h-4 w-4" />}>
                Open Itinerary Builder
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Type city (e.g. Goa, Singapore, Jaipur, Paris)..."
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-subtle font-medium"
          />
          {isSearching && (
            <div className="absolute right-3.5 top-3.5">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            </div>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all capitalize ${
                selectedCategory === cat
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchActivities(cityName, selectedCategory)} />}

      {/* Activity Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((x) => (
            <Skeleton key={x} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          title={`No OpenStreetMap places found for "${cityName}"`}
          description="Try searching for another city name like Goa, Singapore, Jaipur, or Paris."
          icon={<Compass className="h-8 w-8 text-sky-600" />}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((item) => {
            const displayImage = item.thumbnail || item.image;
            const categoryTag = item.subcategory || item.category || "tourist_attraction";

            return (
              <article
                key={item.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all duration-200 hover:border-sky-300 hover:shadow-floating"
              >
                {/* Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={item.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col h-full w-full items-center justify-center bg-slate-50 text-slate-400 p-4 text-center">
                      <Compass className="h-10 w-10 mb-1 text-sky-500/60" />
                      <span className="text-xs font-semibold text-slate-500 capitalize">{categoryTag.replace(/_/g, " ")}</span>
                    </div>
                  )}

                  {/* Category Tag */}
                  <div className="absolute top-3 left-3">
                    <Badge variant="sky" size="sm" className="bg-slate-900/80 backdrop-blur-md text-white font-bold capitalize">
                      {categoryTag.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-sky-700 transition-colors line-clamp-2">
                      {item.name}
                    </h3>

                    {item.latitude && item.longitude && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>
                          {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                        </span>
                      </div>
                    )}

                    {item.duration && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.duration}</span>
                      </div>
                    )}

                    {item.description && (
                      <p className="line-clamp-3 text-xs text-slate-500 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link to={tripId ? `/trips/${tripId}/builder` : "/trips/new"} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        className="w-full justify-center hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 font-bold"
                      >
                        Add to Itinerary
                      </Button>
                    </Link>
                    {item.wikipedia && (
                      <a
                        href={item.wikipedia}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="View Wikipedia"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
