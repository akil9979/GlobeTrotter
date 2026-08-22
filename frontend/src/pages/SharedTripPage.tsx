import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import {
  Compass,
  Calendar,
  Share2,
  Copy,
  MapPin,
  Clock,
  DollarSign,
  Sparkles,
  Check,
} from "lucide-react";

type SharedActivity = {
  name: string;
  category: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  cost: number;
  notes: string | null;
};

type SharedDay = {
  date: string;
  city: { name: string; country: string; image: string | null } | null;
  activities: SharedActivity[];
  dailyCost: { actualExpenses: number; estimatedActivities: number; totalCommitted: number };
};

type SharedItinerary = {
  trip: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    plannedBudget: number | null;
  };
  days: SharedDay[];
  summary: {
    totalSpent: number;
    estimatedActivityCost: number;
    tripTotal: number;
    plannedBudget: number | null;
    isOverBudget: boolean;
    overBudgetAmount: number;
  };
};

const formatMoney = (value: number | null) =>
  value === null
    ? "No budget set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

const formatDate = (value: string, includeYear = false) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });

export const SharedTripPage = () => {
  const { shareToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [itinerary, setItinerary] = useState<SharedItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const load = useCallback(async () => {
    if (!shareToken) {
      setError("This shared trip link is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItinerary(
        (await apiClient<{ itinerary: SharedItinerary }>(`/shared/${shareToken}`)).itinerary
      );
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 404
          ? "This shared trip is no longer available."
          : "Unable to load this shared trip. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyTrip = async () => {
    if (!shareToken) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setCopying(true);
    setError(null);
    try {
      const { trip } = await apiClient<{ trip: { id: string } }>(
        `/shared/${shareToken}/copy`,
        { method: "POST" }
      );
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 404
          ? "This shared trip is no longer available."
          : "Unable to copy this trip. Please try again."
      );
    } finally {
      setCopying(false);
    }
  };

  if (loading) return <LoadingState label="Loading shared itinerary..." />;

  if (!itinerary) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState message={error ?? "This shared trip is unavailable."} onRetry={() => void load()} />
      </main>
    );
  }

  const cities = itinerary.days.reduce<string[]>(
    (result, day) =>
      day.city && !result.includes(`${day.city.name}, ${day.city.country}`)
        ? [...result, `${day.city.name}, ${day.city.country}`]
        : result,
    []
  );

  let previousCity: string | null = null;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* Branded Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white shadow-card">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
            <Share2 className="h-4 w-4" /> Shared Public Itinerary
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
                {itinerary.trip.name}
              </h1>
              <p className="text-sm text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-400" />
                {formatDate(itinerary.trip.startDate, true)} – {formatDate(itinerary.trip.endDate, true)}
              </p>
              {itinerary.trip.description && (
                <p className="text-sm text-slate-200 leading-relaxed pt-1">
                  {itinerary.trip.description}
                </p>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              isLoading={copying}
              disabled={authLoading}
              leftIcon={<Copy className="h-4 w-4" />}
              onClick={() => void copyTrip()}
              className="bg-white text-slate-950 hover:bg-sky-50 font-bold shrink-0 shadow-md"
            >
              {authLoading ? "Checking account..." : copying ? "Copying trip..." : "Copy to My Trips"}
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Day-by-Day Timeline */}
        <div className="space-y-5">
          {error && <ErrorState message={error} />}

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Itinerary Schedule</h2>

            <div className="space-y-4">
              {itinerary.days.map((day) => {
                const cityLabel = day.city ? `${day.city.name}, ${day.city.country}` : null;
                const transition = cityLabel !== previousCity;
                previousCity = cityLabel;

                return (
                  <article
                    key={day.date}
                    className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-subtle"
                  >
                    {transition && (
                      <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-4 py-2.5 text-xs font-bold text-sky-800">
                        <MapPin className="h-3.5 w-3.5 text-sky-600" />
                        {day.city ? `Arrive in ${cityLabel}` : "Travel Day"}
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {formatDate(day.date, true)}
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                          Daily Cost: {formatMoney(day.dailyCost.totalCommitted)}
                        </span>
                      </div>

                      {day.activities.length ? (
                        <div className="space-y-2">
                          {day.activities.map((activity, idx) => (
                            <div
                              key={`${day.date}-${activity.name}-${idx}`}
                              className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                            >
                              <Badge variant="sky" size="sm" className="mt-0.5 shrink-0">
                                {activity.startTime?.slice(0, 5) ?? "Flex"}
                              </Badge>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h4 className="font-bold text-slate-900 text-sm">{activity.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>{activity.category}</span>
                                  {activity.durationMinutes && (
                                    <span>• {activity.durationMinutes} mins</span>
                                  )}
                                </div>
                                {activity.notes && (
                                  <p className="text-xs text-slate-600 pt-1">{activity.notes}</p>
                                )}
                              </div>

                              <span className="text-xs font-bold text-slate-900 shrink-0">
                                {formatMoney(activity.cost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-1">No activities scheduled for this day.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-3">
            <h2 className="font-bold text-slate-900 text-base">Trip Overview</h2>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Destinations</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {cities.length ? cities.join(" • ") : "No cities added"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 font-medium">Budget Limit</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {formatMoney(itinerary.summary.plannedBudget)}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500 font-medium">Committed Total</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {formatMoney(itinerary.summary.tripTotal)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50/50 p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-1.5 text-sky-900 font-bold text-sm">
              <Sparkles className="h-4 w-4" /> Personalize This Trip
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Copy this public itinerary into your account to customize dates, activities, and budget tracking.
            </p>
            <Button
              variant="primary"
              size="md"
              isLoading={copying}
              disabled={authLoading}
              onClick={() => void copyTrip()}
              className="w-full"
            >
              {copying ? "Copying trip..." : "Copy to My Trips"}
            </Button>
          </section>
        </aside>
      </div>

      {itinerary.days.length === 0 && (
        <div className="mx-auto max-w-5xl px-4">
          <EmptyState
            title="No itinerary days found"
            description="This shared trip does not have scheduled dates yet."
          />
        </div>
      )}
    </main>
  );
};
