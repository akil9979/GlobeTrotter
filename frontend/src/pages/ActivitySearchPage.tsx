import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Compass, Search, Clock, DollarSign, ArrowLeft, Plus } from "lucide-react";

type Activity = {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  durationMinutes: number | null;
  image: string | null;
};

const formatMoney = (amount: number | null) =>
  amount === null
    ? "Free / Varies"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount);

export const ActivitySearchPage = () => {
  const { tripId } = useParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = () => {
    setIsLoading(true);
    setError(null);
    apiClient<{ activities: Activity[] }>(`/activities?q=${encodeURIComponent(searchQuery)}&limit=24`)
      .then((res) => setActivities(res.activities))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(loadActivities, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/trips/${tripId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trip Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Activity Catalog
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Explore Experiences
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Find sights, museum tickets, food tours, and excursions for your trip.
            </p>
          </div>

          <Link to={`/trips/${tripId}/builder`}>
            <Button variant="primary" size="md" leftIcon={<Compass className="h-4 w-4" />}>
              Open Itinerary Builder
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Search activities, tours, dining..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-subtle"
        />
      </div>

      {error && <ErrorState message={error} onRetry={loadActivities} />}

      {/* Activity Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((x) => (
            <Skeleton key={x} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:border-sky-300 hover:shadow-floating"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                    {item.name}
                  </h3>
                  <Badge variant="emerald" size="sm" className="shrink-0">
                    {formatMoney(item.estimatedCost)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {item.durationMinutes ? `${item.durationMinutes} mins` : "Flexible duration"}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    {item.estimatedCost ? "Budget Aware" : "Free Access"}
                  </span>
                </div>

                {item.description && (
                  <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link to={`/trips/${tripId}/builder`}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="w-full justify-center hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                  >
                    Schedule in Builder
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
