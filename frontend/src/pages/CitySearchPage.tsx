import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { SearchAutocomplete, CityResult } from "../components/SearchAutocomplete";
import { MapPin, Plus, ArrowLeft, Building } from "lucide-react";

type City = {
  id: string;
  name: string;
  country: string;
  description: string | null;
  image: string | null;
};

export const CitySearchPage = () => {
  const { tripId } = useParams();
  const [cities, setCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCities = () => {
    setIsLoading(true);
    setError(null);
    apiClient<{ cities: City[] }>(`/cities?search=${encodeURIComponent(searchQuery)}&limit=30`)
      .then((res) => setCities(res.cities))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(loadCities, [searchQuery]);

  const handleSelectCity = (selected: CityResult) => {
    setSearchQuery(selected.name);
  };

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
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Real-time City Directory
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Explore Destinations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Type any city (e.g. <span className="font-bold text-sky-700">tok</span> for Tokyo, <span className="font-bold text-sky-700">rom</span> for Rome) to get instant backend suggestions.
            </p>
          </div>

          {tripId && (
            <Link to={`/trips/${tripId}/builder`}>
              <Button variant="primary" size="md" leftIcon={<Building className="h-4 w-4" />}>
                Open Itinerary Builder
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Realtime Search Component */}
      <div className="max-w-xl">
        <SearchAutocomplete
          placeholder="Type to search destinations in real-time (e.g. tok, rom, lon, par)..."
          value={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectCity={handleSelectCity}
        />
      </div>

      {error && <ErrorState message={error} onRetry={loadCities} />}

      {/* City Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((x) => (
            <Skeleton key={x} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : cities.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <MapPin className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-lg">No matching destinations found</p>
          <p className="text-sm text-slate-500">Try searching for another city, region, or country name.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <article
              key={city.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all duration-200 hover:border-sky-300 hover:shadow-floating"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-200">
                {city.image ? (
                  <img
                    src={city.image}
                    alt={city.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <MapPin className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge variant="slate" size="sm" className="bg-white/90 backdrop-blur-sm shadow-sm font-semibold">
                    {city.country}
                  </Badge>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-sky-700 transition-colors">
                    {city.name}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500 leading-relaxed">
                    {city.description || "Explore top attractions, dining, and daily activities in this destination."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Link to={tripId ? `/trips/${tripId}/builder` : "/trips/new"}>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      className="w-full justify-center hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                    >
                      Add to Route
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
