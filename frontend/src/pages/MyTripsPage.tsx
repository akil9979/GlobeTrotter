import { FormEvent, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { TripCardSkeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import {
  Compass,
  PlusCircle,
  Search,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  Wallet,
} from "lucide-react";

type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  destinationCount: number;
  coverImage: string | null;
};

const formatMoney = (value: number | null) =>
  value === null
    ? "No budget set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

const formatDateRange = (trip: Trip) => {
  const start = new Date(`${trip.startDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const end = new Date(`${trip.endDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

const getTripStatus = (trip: Trip): "Upcoming" | "In progress" | "Completed" => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);
  if (end < today) return "Completed";
  if (start <= today) return "In progress";
  return "Upcoming";
};

type FilterTab = "all" | "upcoming" | "in-progress" | "completed";

export const MyTripsPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setError(null);
    setIsLoading(true);
    apiClient<{ trips: Trip[] }>("/trips")
      .then(({ trips: data }) => setTrips(data))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const confirmDelete = async () => {
    if (!deletingTrip) return;
    setBusyId(deletingTrip.id);
    try {
      await apiClient<void>(`/trips/${deletingTrip.id}`, { method: "DELETE" });
      setTrips((current) => current?.filter(({ id }) => id !== deletingTrip.id) ?? null);
      setDeletingTrip(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete this trip.");
    } finally {
      setBusyId(null);
    }
  };

  const saveTripEdit = async (
    input: Pick<Trip, "name" | "startDate" | "endDate" | "budget">
  ) => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const { trip } = await apiClient<{ trip: Trip }>(`/trips/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      setTrips(
        (current) =>
          current?.map((item) => (item.id === trip.id ? { ...item, ...trip } : item)) ?? null
      );
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this trip.");
    } finally {
      setBusyId(null);
    }
  };

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter((trip) => {
      const matchesSearch = trip.name.toLowerCase().includes(searchQuery.toLowerCase());
      const tripStatus = getTripStatus(trip);
      if (activeTab === "upcoming") return matchesSearch && tripStatus === "Upcoming";
      if (activeTab === "in-progress") return matchesSearch && tripStatus === "In progress";
      if (activeTab === "completed") return matchesSearch && tripStatus === "Completed";
      return matchesSearch;
    });
  }, [trips, searchQuery, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Travel Journal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Trips
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your past, present, and upcoming adventures.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<PlusCircle className="h-4 w-4" />}
          onClick={() => navigate("/trips/new")}
        >
          Plan New Trip
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Controls: Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          <TabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            label="All Trips"
            count={trips?.length}
          />
          <TabButton
            active={activeTab === "upcoming"}
            onClick={() => setActiveTab("upcoming")}
            label="Upcoming"
          />
          <TabButton
            active={activeTab === "in-progress"}
            onClick={() => setActiveTab("in-progress")}
            label="In Progress"
          />
          <TabButton
            active={activeTab === "completed"}
            onClick={() => setActiveTab("completed")}
            label="Completed"
          />
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((x) => (
            <TripCardSkeleton key={x} />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching trips found" : "Your travel journal is empty"}
          description={
            searchQuery
              ? `No itineraries match "${searchQuery}". Try clearing your search.`
              : "Create your first trip to start organizing your daily itinerary and budget."
          }
          icon={<Compass className="h-8 w-8 text-sky-600" />}
          actionLabel={searchQuery ? "Clear Search" : "Create a Trip"}
          onAction={searchQuery ? () => setSearchQuery("") : () => navigate("/trips/new")}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              busy={busyId === trip.id}
              onEdit={() => setEditing(trip)}
              onDelete={() => setDeletingTrip(trip)}
            />
          ))}
        </div>
      )}

      {/* Edit Trip Modal */}
      {editing && (
        <EditTripModal
          trip={editing}
          saving={busyId === editing.id}
          onCancel={() => setEditing(null)}
          onSave={saveTripEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTrip)}
        onClose={() => setDeletingTrip(null)}
        title="Delete Trip"
        description={`Are you sure you want to delete "${deletingTrip?.name}"? All associated itinerary days, activities, and budget items will be permanently removed.`}
        confirmText="Delete Trip"
        onConfirm={confirmDelete}
        isConfirming={busyId === deletingTrip?.id}
        variant="danger"
      />
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
      active
        ? "bg-slate-900 text-white shadow-subtle"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`}
  >
    <span>{label}</span>
    {count !== undefined && (
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
          active ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

const TripCard = ({
  trip,
  busy,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const currentStatus = getTripStatus(trip);

  const badgeVariant =
    currentStatus === "Upcoming"
      ? "sky"
      : currentStatus === "In progress"
      ? "amber"
      : "slate";

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all duration-200 hover:border-sky-300 hover:shadow-floating">
      {/* Card Header / Image Cover */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sky-400/40">
            <Compass className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant={badgeVariant} size="sm" className="shadow-sm">
            {currentStatus}
          </Badge>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-1">
              {trip.name}
            </h2>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{formatDateRange(trip)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                {trip.destinationCount} {trip.destinationCount === 1 ? "destination" : "destinations"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">{formatMoney(trip.budget)}</span>
            </div>
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1">
            <Link to={`/trips/${trip.id}`}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                View
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={onEdit}
            >
              Edit
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            isLoading={busy}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
};

const EditTripModal = ({
  trip,
  saving,
  onCancel,
  onSave,
}: {
  trip: Trip;
  saving: boolean;
  onCancel: () => void;
  onSave: (
    input: Pick<Trip, "name" | "startDate" | "endDate" | "budget">
  ) => Promise<void>;
}) => {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      name: String(form.get("name")),
      startDate: String(form.get("startDate")),
      endDate: String(form.get("endDate")),
      budget: form.get("budget") === "" ? null : Number(form.get("budget")),
    });
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title="Edit Trip Details">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-name">
            Trip Title
          </label>
          <input
            id="edit-name"
            required
            name="name"
            defaultValue={trip.name}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-start">
              Start Date
            </label>
            <input
              id="edit-start"
              required
              type="date"
              name="startDate"
              defaultValue={trip.startDate}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-end">
              End Date
            </label>
            <input
              id="edit-end"
              required
              type="date"
              name="endDate"
              defaultValue={trip.endDate}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-budget">
            Planned Budget (USD)
          </label>
          <input
            id="edit-budget"
            type="number"
            min="0"
            step="1"
            name="budget"
            defaultValue={trip.budget ?? ""}
            placeholder="e.g. 2500"
            className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
