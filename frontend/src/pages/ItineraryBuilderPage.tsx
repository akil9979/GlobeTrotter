import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { TripOptimizerModal } from "../features/optimizer/TripOptimizerModal";
import { SchedulingHealthBanner } from "../features/itinerary/SchedulingHealthBanner";
import { SearchAutocomplete } from "../components/SearchAutocomplete";
import type { SchedulingIntelligenceResponse } from "../types/schedulingIntelligence";
import {
  Compass,
  MapPin,
  Calendar,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Clock,
  DollarSign,
  ArrowLeft,
  Sparkles,
  Check,
  Bot,
} from "lucide-react";

type City = {
  id: string;
  name: string;
  country: string;
  description: string | null;
  image: string | null;
};

type Stop = {
  id: string;
  cityId: string;
  city: City;
  stopOrder: number;
  arrivalDate: string;
  departureDate: string;
};

type CatalogActivity = {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  durationMinutes: number | null;
  image: string | null;
};

type ScheduledActivity = {
  id: string;
  tripStopId: string;
  activityId: string;
  activityName: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  customCost: number | null;
  status: string;
  sortOrder: number;
};

type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  stops: Stop[];
};

type ScheduleInput = {
  tripStopId: string;
  activityId: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  customCost: number | null;
};

const formatMoney = (value: number | null) => {
  if (value === null || value === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

// Always returns a clean YYYY-MM-DD string regardless of whether the value is
// a full ISO timestamp (2026-08-22T00:00:00.000Z) or already a date string.
const toIsoDate = (value: string): string => value.slice(0, 10);

export const ItineraryBuilderPage = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [intelligence, setIntelligence] = useState<SchedulingIntelligenceResponse | null>(null);

  const load = () => {
    if (!tripId) return;
    setError(null);
    setIsLoading(true);
    Promise.all([
      apiClient<{ trip: Trip }>(`/trips/${tripId}?includeStops=true`),
      apiClient<{ scheduledActivities: ScheduledActivity[] }>(`/trips/${tripId}/activities`),
      apiClient<{ intelligence: SchedulingIntelligenceResponse }>(`/trips/${tripId}/scheduling-intelligence`).catch(
        () => ({ intelligence: null })
      ),
    ])
      .then(([t, a, intel]) => {
        setTrip(t.trip);
        setActivities(a.scheduledActivities);
        if (intel?.intelligence) {
          setIntelligence(intel.intelligence);
        }
        setActiveStopId((current) =>
          current && t.trip.stops.some((stop) => stop.id === current)
            ? current
            : t.trip.stops[0]?.id ?? null
        );
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [tripId]);

  const activeStop = trip?.stops.find((stop) => stop.id === activeStopId) ?? null;
  const stopActivities = useMemo(
    () => activities.filter((activity) => activity.tripStopId === activeStopId),
    [activities, activeStopId]
  );

  const mutate = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      load();
    } catch (reason) {
      setError(getConflictMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return <ErrorState message={error ?? "Unable to load itinerary builder."} onRetry={load} />;
  }

  const reorderStops = (direction: -1 | 1) => {
    const current = trip.stops.findIndex((stop) => stop.id === activeStopId);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= trip.stops.length) return;
    const ordered = [...trip.stops];
    [ordered[current], ordered[target]] = [ordered[target], ordered[current]];
    mutate(() =>
      apiClient(`/trips/${trip.id}/stops/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          items: ordered.map((stop, index) => ({ id: stop.id, order: index + 1 })),
        }),
      })
    );
  };

  const confirmRemoveStop = () => {
    if (!activeStop) return;
    mutate(async () => {
      await apiClient(`/trips/${trip.id}/stops/${activeStop.id}`, { method: "DELETE" });
      const remaining = trip.stops.filter((item) => item.id !== activeStop.id);
      if (remaining.length) {
        await apiClient(`/trips/${trip.id}/stops/reorder`, {
          method: "PATCH",
          body: JSON.stringify({
            items: remaining.map((item, index) => ({ id: item.id, order: index + 1 })),
          }),
        });
      }
      setDeletingStop(null);
    });
  };

  const confirmDeleteActivity = () => {
    if (!deletingActivityId) return;
    mutate(async () => {
      await apiClient(`/trips/${trip.id}/activities/${deletingActivityId}`, { method: "DELETE" });
      setDeletingActivityId(null);
    });
  };

  const reorderActivities = (id: string, direction: -1 | 1) => {
    const current = stopActivities.findIndex((item) => item.id === id);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= stopActivities.length) return;
    const ordered = [...activities];
    const first = ordered.findIndex((item) => item.id === stopActivities[current].id);
    const second = ordered.findIndex((item) => item.id === stopActivities[target].id);
    [ordered[first], ordered[second]] = [ordered[second], ordered[first]];
    mutate(() =>
      apiClient(`/trips/${trip.id}/activities/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          items: ordered.map((item, index) => ({ id: item.id, order: index + 1 })),
        }),
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link
            to={`/trips/${trip.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trip Overview
          </Link>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5 text-sky-600" />}
            onClick={() => setOptimizerOpen(true)}
            className="bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-sky-900 font-bold"
          >
            Optimize with AI
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-floating sm:p-8">
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Itinerary Builder
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              {trip.name}
            </h1>
            <p className="text-sm text-slate-300">
              Add city stops to your route, then discover and schedule activities day by day.
            </p>
          </div>
        </section>
      </div>

      {error && <ErrorState message={error} />}

      {/* Scheduling Intelligence Health & Conflict Banner */}
      <SchedulingHealthBanner
        tripId={trip.id}
        intelligence={intelligence}
        onResolved={load}
      />

      <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* Left Column: Add & List City Stops */}
        <aside className="space-y-6">
          <StopSearch
            trip={trip}
            saving={saving}
            onAdd={(data) =>
              mutate(() =>
                apiClient(`/trips/${trip.id}/stops`, {
                  method: "POST",
                  body: JSON.stringify({ ...data, stopOrder: trip.stops.length + 1 }),
                })
              )
            }
          />

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" /> City Route
              </h2>
              <Badge variant="sky" size="sm">
                {trip.stops.length} Stops
              </Badge>
            </div>

            {trip.stops.length ? (
              <ol className="space-y-2">
                {trip.stops.map((stop, index) => (
                  <li key={stop.id}>
                    <button
                      onClick={() => setActiveStopId(stop.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                        stop.id === activeStopId
                          ? "bg-sky-50 text-sky-900 border border-sky-200 shadow-subtle"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-slate-900 text-sm">
                          {stop.city.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatDate(stop.arrivalDate)} – {formatDate(stop.departureDate)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No city stops yet"
                description="Search the city catalog above to start building your route."
              />
            )}
          </section>
        </aside>

        {/* Right Column: Active Stop Activities Panel */}
        <main>
          {activeStop ? (
            <StopPanel
              trip={trip}
              stop={activeStop}
              activities={stopActivities}
              saving={saving}
              onMoveStop={reorderStops}
              onRemoveStop={() => setDeletingStop(activeStop)}
              onUpdateStop={(input) =>
                mutate(() =>
                  apiClient(`/trips/${trip.id}/stops/${activeStop.id}`, {
                    method: "PUT",
                    body: JSON.stringify(input),
                  })
                )
              }
              onAddActivity={(input) =>
                mutate(() =>
                  apiClient(`/trips/${trip.id}/activities`, {
                    method: "POST",
                    body: JSON.stringify({
                      ...input,
                      sortOrder:
                        Math.max(
                          0,
                          ...stopActivities
                            .filter((item) => item.activityDate === input.activityDate)
                            .map((item) => item.sortOrder)
                        ) + 1,
                    }),
                  })
                )
              }
              onEditActivity={(id, input) =>
                mutate(() =>
                  apiClient(`/trips/${trip.id}/activities/${id}`, {
                    method: "PUT",
                    body: JSON.stringify(input),
                  })
                )
              }
              onDeleteActivity={(id) => setDeletingActivityId(id)}
              onMoveActivity={reorderActivities}
            />
          ) : (
            <EmptyState
              title="Select or add a city stop"
              description="Once a city is added to your route, you can search and schedule activities for each day."
              icon={<Compass className="h-8 w-8 text-sky-600" />}
            />
          )}
        </main>
      </div>

      {/* Delete Stop Modal */}
      <Modal
        isOpen={Boolean(deletingStop)}
        onClose={() => setDeletingStop(null)}
        title={`Remove ${deletingStop?.city.name}?`}
        description="Removing this city stop will also delete any activities scheduled during this stop."
        confirmText="Remove Stop"
        onConfirm={confirmRemoveStop}
        isConfirming={saving}
        variant="danger"
      />

      {/* Delete Activity Modal */}
      <Modal
        isOpen={Boolean(deletingActivityId)}
        onClose={() => setDeletingActivityId(null)}
        title="Delete Activity?"
        description="Are you sure you want to remove this scheduled activity from your itinerary?"
        confirmText="Delete Activity"
        onConfirm={confirmDeleteActivity}
        isConfirming={saving}
        variant="danger"
      />

      {/* AI Trip Optimizer Modal */}
      <TripOptimizerModal
        isOpen={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        tripId={trip.id}
        tripName={trip.name}
        initialStartDate={trip.startDate}
        initialEndDate={trip.endDate}
        initialDestination={trip.stops.map((s) => s.city.name).join(", ")}
        onSuccess={() => {
          setOptimizerOpen(false);
          load();
        }}
      />
    </div>
  );
};

const StopSearch = ({
  trip,
  saving,
  onAdd,
}: {
  trip: Trip;
  saving: boolean;
  onAdd: (input: { cityId: string; arrivalDate: string; departureDate: string }) => void;
}) => {
  const [selected, setSelected] = useState<City | null>(null);
  const [arrivalDate, setArrival] = useState(trip.startDate);
  const [departureDate, setDeparture] = useState(trip.endDate);
  const [message, setMessage] = useState<string | null>(null);

  const add = () => {
    if (!selected) return setMessage("Choose a city first.");
    if (departureDate < arrivalDate)
      return setMessage("Departure date must be on or after arrival date.");
    setMessage(null);
    onAdd({ cityId: selected.id, arrivalDate, departureDate });
    setSelected(null);
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-3">
      <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
        Step 1 • Add Stop
      </span>
      <h2 className="font-bold text-slate-900 text-base">Find Destination City</h2>

      <div className="relative">
        <SearchAutocomplete
          placeholder="Type to search (e.g. tok for Tokyo, par for Paris)..."
          value={selected?.name || ""}
          onSelectCity={(city) => {
            setSelected({
              id: city.id,
              name: city.name,
              country: city.country,
              description: city.description ?? null,
              image: city.image ?? null,
            });
            setMessage(null);
          }}
        />
      </div>

      {selected && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 animate-in fade-in-50">
          <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900 bg-sky-50/70 p-2.5 rounded-xl border border-sky-100">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              <span>{selected.name}, {selected.country}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Change
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Arrival</label>
              <input
                type="date"
                min={trip.startDate}
                max={trip.endDate}
                value={arrivalDate}
                onChange={(e) => setArrival(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Departure</label>
              <input
                type="date"
                min={arrivalDate || trip.startDate}
                max={trip.endDate}
                value={departureDate}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none"
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={add}
            className="w-full"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add City Stop
          </Button>
        </div>
      )}

      {message && <p className="text-xs font-medium text-rose-600">{message}</p>}
    </section>
  );
};

const StopPanel = ({
  trip,
  stop,
  activities,
  saving,
  onMoveStop,
  onRemoveStop,
  onUpdateStop,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveActivity,
}: {
  trip: Trip;
  stop: Stop;
  activities: ScheduledActivity[];
  saving: boolean;
  onMoveStop: (direction: -1 | 1) => void;
  onRemoveStop: () => void;
  onUpdateStop: (input: Partial<Stop>) => void;
  onAddActivity: (input: ScheduleInput) => void;
  onEditActivity: (id: string, input: Partial<ScheduleInput>) => void;
  onDeleteActivity: (id: string) => void;
  onMoveActivity: (id: string, direction: -1 | 1) => void;
}) => {
  const [editingStop, setEditingStop] = useState(false);
  const [catalog, setCatalog] = useState<CatalogActivity[]>([]);
  const [query, setQuery] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CatalogActivity | null>(null);
  const [editingActivity, setEditingActivity] = useState<ScheduledActivity | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-fetch activities for city with 250ms debounce
  useEffect(() => {
    setLoadingCatalog(true);
    setLocalError(null);
    const timer = setTimeout(() => {
      const searchTerm = query.trim() || stop.city.name;
      apiClient<{ activities: CatalogActivity[] }>(
        `/activities?city=${encodeURIComponent(searchTerm)}&limit=12`
      )
        .then((res) => setCatalog(res.activities || []))
        .catch((reason) => setLocalError(reason instanceof Error ? reason.message : "Activity search failed."))
        .finally(() => setLoadingCatalog(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, stop.city.name, stop.cityId]);

  const searchActivities = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Stop Card Banner */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              City Stop {stop.stopOrder}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">{stop.city.name}</h2>
            <p className="text-sm text-slate-500">
              {stop.city.country} • {formatDate(stop.arrivalDate)} – {formatDate(stop.departureDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onMoveStop(-1)}
              leftIcon={<ArrowUp className="h-3.5 w-3.5" />}
              title="Move Up"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onMoveStop(1)}
              leftIcon={<ArrowDown className="h-3.5 w-3.5" />}
              title="Move Down"
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => setEditingStop(!editingStop)}
            >
              Dates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onRemoveStop}
              className="text-rose-600 hover:bg-rose-50"
            >
              Remove
            </Button>
          </div>
        </div>

        {editingStop && (
          <StopDatesForm
            trip={trip}
            stop={stop}
            onSave={(data) => {
              onUpdateStop(data);
              setEditingStop(false);
            }}
          />
        )}
      </section>

      {/* Activity Catalog Search */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Step 2 • Activities in {stop.city.name}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900">Real API Activities & Live Pricing</h3>
          </div>

          {catalog.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-sky-200" />}
              onClick={async () => {
                const timeSlots = ["09:30", "14:00", "18:30"];
                const endSlots = ["12:00", "16:30", "21:00"];
                const topItems = catalog.slice(0, 4);
                for (let i = 0; i < topItems.length; i++) {
                  const act = topItems[i];
                  await onAddActivity({
                    tripStopId: stop.id,
                    activityId: act.id,
                    activityDate: toIsoDate(stop.arrivalDate),
                    startTime: timeSlots[i % timeSlots.length],
                    endTime: endSlots[i % endSlots.length],
                    customCost: act.estimatedCost ? Number(act.estimatedCost) : 500,
                  });
                }
              }}
              className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shrink-0 shadow-sm"
            >
              ⚡ Auto-Add Top {Math.min(4, catalog.length)} API Activities
            </Button>
          )}
        </div>

        <form onSubmit={searchActivities} className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search activities in ${stop.city.name}...`}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>
          <Button variant="secondary" size="md" type="submit">
            Search
          </Button>
        </form>

        {loadingCatalog ? (
          <div className="p-4 text-center text-xs font-semibold text-sky-700 animate-pulse">
            Fetching real-time API activities for {stop.city.name}...
          </div>
        ) : catalog.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  selectedActivity?.id === item.id
                    ? "border-sky-500 bg-sky-50/80 ring-2 ring-sky-100 shadow-sm"
                    : "border-slate-200 hover:border-sky-300 bg-white hover:shadow-subtle"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    <Badge variant="emerald" size="sm" className="shrink-0 font-bold">
                      {formatMoney(item.estimatedCost)}
                    </Badge>
                  </div>

                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {item.durationMinutes ? `${item.durationMinutes} mins` : "120 mins"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedActivity(item)}
                    className="flex-1 text-xs"
                  >
                    Custom Time
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      onAddActivity({
                        tripStopId: stop.id,
                        activityId: item.id,
                        activityDate: toIsoDate(stop.arrivalDate),
                        startTime: "10:00",
                        endTime: "12:30",
                        customCost: item.estimatedCost ? Number(item.estimatedCost) : 500,
                      })
                    }
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="flex-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    Quick Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {selectedActivity && (
          <ActivityForm
            key={selectedActivity.id}
            stop={stop}
            activity={selectedActivity}
            saving={saving}
            onCancel={() => setSelectedActivity(null)}
            onSave={(input) => {
              setLocalError(null);
              onAddActivity({ ...input, tripStopId: stop.id, activityId: selectedActivity.id });
              setSelectedActivity(null);
            }}
          />
        )}

        {localError && <p className="text-xs font-medium text-rose-600">{localError}</p>}
      </section>

      {/* Scheduled Activities List */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base">Scheduled Activities</h3>
          <Badge variant="sky" size="sm">
            {activities.length} Planned
          </Badge>
        </div>

        {activities.length ? (
          <div className="space-y-2.5">
            {activities.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all hover:bg-white hover:shadow-subtle"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate font-bold text-slate-900 text-sm">{item.activityName}</h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(item.activityDate)}</span>
                      {item.startTime && (
                        <span>• {item.startTime} – {item.endTime}</span>
                      )}
                      <span>• {formatMoney(item.customCost)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => onMoveActivity(item.id, -1)}
                    leftIcon={<ArrowUp className="h-3.5 w-3.5" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => onMoveActivity(item.id, 1)}
                    leftIcon={<ArrowDown className="h-3.5 w-3.5" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingActivity(item)}
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => onDeleteActivity(item.id)}
                    leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-600" />}
                    className="hover:bg-rose-50"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No scheduled activities"
            description="Search activities above to add them to your itinerary for this city stop."
          />
        )}
      </section>

      {editingActivity && (
        <ActivityForm
          stop={stop}
          activity={{
            id: editingActivity.activityId,
            name: editingActivity.activityName,
            description: null,
            estimatedCost: editingActivity.customCost,
            durationMinutes: null,
            image: null,
          }}
          initial={editingActivity}
          saving={saving}
          onCancel={() => setEditingActivity(null)}
          onSave={(input) => {
            onEditActivity(editingActivity.id, input);
            setEditingActivity(null);
          }}
        />
      )}
    </div>
  );
};

const StopDatesForm = ({
  trip,
  stop,
  onSave,
}: {
  trip: Trip;
  stop: Stop;
  onSave: (input: { arrivalDate: string; departureDate: string }) => void;
}) => {
  const [arrivalDate, setArrival] = useState(stop.arrivalDate);
  const [departureDate, setDeparture] = useState(stop.departureDate);
  const [message, setMessage] = useState("");

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Date</label>
        <input
          type="date"
          min={trip.startDate}
          max={trip.endDate}
          value={arrivalDate}
          onChange={(e) => setArrival(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
        <input
          type="date"
          min={arrivalDate}
          max={trip.endDate}
          value={departureDate}
          onChange={(e) => setDeparture(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none"
        />
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          if (departureDate < arrivalDate) {
            setMessage("Departure must be on or after arrival.");
          } else {
            onSave({ arrivalDate, departureDate });
          }
        }}
      >
        Save Dates
      </Button>

      {message && <p className="text-xs text-rose-600 font-medium">{message}</p>}
    </div>
  );
};

const ActivityForm = ({
  stop,
  activity,
  initial,
  saving,
  onCancel,
  onSave,
}: {
  stop: Stop;
  activity: CatalogActivity;
  initial?: ScheduledActivity;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ScheduleInput) => void;
}) => {
  const [activityDate, setDate] = useState(toIsoDate(initial?.activityDate ?? stop.arrivalDate));
  const [startTime, setStart] = useState(initial?.startTime ?? "");
  const [endTime, setEnd] = useState(initial?.endTime ?? "");
  const [cost, setCost] = useState(
    initial?.customCost?.toString() ?? activity.estimatedCost?.toString() ?? ""
  );
  const [message, setMessage] = useState("");

  const submit = () => {
    if (activityDate < stop.arrivalDate || activityDate > stop.departureDate) {
      return setMessage("Activity date must fall within this city stop.");
    }
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return setMessage("Provide both start and end times, or leave both empty.");
    }
    if (startTime && endTime && endTime <= startTime) {
      return setMessage("End time must be later than start time.");
    }
    if (cost && Number(cost) < 0) {
      return setMessage("Cost cannot be negative.");
    }
    onSave({
      tripStopId: stop.id,
      activityId: activity.id,
      activityDate,
      startTime: startTime || null,
      endTime: endTime || null,
      customCost: cost === "" ? null : Number(cost),
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 text-sm">
          {initial ? "Edit Schedule:" : "Schedule:"} {activity.name}
        </h4>
        <button onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
          <input
            type="date"
            min={stop.arrivalDate}
            max={stop.departureDate}
            value={activityDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (INR ₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
        </div>
      </div>

      {message && <p className="text-xs font-medium text-rose-600">{message}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={submit}>
          {initial ? "Save Changes" : "Confirm Schedule"}
        </Button>
      </div>
    </div>
  );
};

const getConflictMessage = (reason: unknown) => {
  if (reason instanceof ApiError && reason.status === 409) {
    const conflicts = (
      reason.details as
        | { conflicts?: { activityName: string; startTime: string; endTime: string }[] }
        | undefined
    )?.conflicts;
    return conflicts?.length
      ? `Time conflict with ${conflicts
          .map((item) => `${item.activityName} (${item.startTime}–${item.endTime})`)
          .join(", ")}.`
      : reason.message;
  }
  return reason instanceof Error ? reason.message : "Something went wrong.";
};
