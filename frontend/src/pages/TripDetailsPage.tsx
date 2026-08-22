import { useEffect, useState } from "react";
import { Link, useParams, NavLink } from "react-router-dom";
import { apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { TripOptimizerModal } from "../features/optimizer/TripOptimizerModal";
import {
  ArrowLeft,
  Calendar,
  Wallet,
  Compass,
  MapPin,
  ListTodo,
  Share2,
  Check,
  Plus,
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  Building,
  Bot,
} from "lucide-react";

type Stop = {
  id: string;
  city: { name: string; country: string; image: string | null };
  arrivalDate: string;
  departureDate: string;
};

type Trip = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  budget: number | null;
  coverImage: string | null;
  stops: Stop[];
  estimatedExpenseTotal: number;
  shareToken?: string;
};

type ScheduledActivity = { id: string };

const formatMoney = (amount: number | null) =>
  amount === null
    ? "No budget set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount);

const formatDateRange = (trip: Trip) => {
  const start = new Date(`${trip.startDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const end = new Date(`${trip.endDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

export const TripDetailsPage = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [issueCount, setIssueCount] = useState<number>(0);

  const load = () => {
    if (!tripId) return;
    setError(null);
    setIsLoading(true);
    Promise.all([
      apiClient<{ trip: Trip }>(`/trips/${tripId}?includeStops=true`),
      apiClient<{ scheduledActivities: ScheduledActivity[] }>(`/trips/${tripId}/activities`),
      apiClient<{ intelligence: { hasIssues: boolean; issues: unknown[] } }>(
        `/trips/${tripId}/scheduling-intelligence`
      ).catch(() => ({ intelligence: { hasIssues: false, issues: [] } })),
    ])
      .then(([tripResponse, activityResponse, intelResponse]) => {
        setTrip(tripResponse.trip);
        setActivityCount(activityResponse.scheduledActivities.length);
        if (intelResponse?.intelligence?.hasIssues) {
          setIssueCount(intelResponse.intelligence.issues.length);
        } else {
          setIssueCount(0);
        }
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [tripId]);

  const copyShareLink = () => {
    if (!trip) return;
    const shareUrl = `${window.location.origin}/share/${trip.shareToken || trip.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !trip) return <ErrorState message={error || "Trip not found"} onRetry={load} />;

  const subNavClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
      isActive
        ? "bg-slate-900 text-white shadow-subtle"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Share Controls */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/trips"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Trips
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5 text-sky-600" />}
            onClick={() => setOptimizerOpen(true)}
            className="bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-sky-900 font-bold"
          >
            AI Optimizer
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={copiedShare ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            onClick={copyShareLink}
          >
            {copiedShare ? "Link Copied!" : "Share Trip"}
          </Button>
        </div>
      </div>

      {/* Hero Header Card */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-floating">
        <div className="relative min-h-[220px] p-6 sm:p-8 flex flex-col justify-end">
          {trip.coverImage && (
            <img
              src={trip.coverImage}
              alt={trip.name}
              className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="sky" size="sm" className="bg-sky-500/20 text-sky-200 border-sky-400/30 backdrop-blur-sm">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDateRange(trip)}
              </Badge>
              <Badge variant="emerald" size="sm" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 backdrop-blur-sm">
                {trip.stops.length} {trip.stops.length === 1 ? "City" : "Cities"}
              </Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              {trip.name}
            </h1>

            {trip.description && (
              <p className="text-sm text-slate-200 leading-relaxed max-w-2xl pt-1">
                {trip.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-card no-scrollbar">
        <NavLink to={`/trips/${trip.id}`} end className={subNavClass}>
          <LayoutDashboard className="h-4 w-4" />
          <span>Overview</span>
        </NavLink>
        <NavLink to={`/trips/${trip.id}/builder`} className={subNavClass}>
          <ListTodo className="h-4 w-4" />
          <span>Itinerary Builder</span>
        </NavLink>
        <NavLink to={`/trips/${trip.id}/cities`} className={subNavClass}>
          <Building className="h-4 w-4" />
          <span>Cities</span>
        </NavLink>
        <NavLink to={`/trips/${trip.id}/activities`} className={subNavClass}>
          <Compass className="h-4 w-4" />
          <span>Activities</span>
        </NavLink>
        <NavLink to={`/trips/${trip.id}/budget`} className={subNavClass}>
          <Wallet className="h-4 w-4" />
          <span>Budget Tracker</span>
        </NavLink>
        <NavLink to={`/trips/${trip.id}/calendar`} className={subNavClass}>
          <CalendarDays className="h-4 w-4" />
          <span>Calendar</span>
        </NavLink>
      </div>

      {/* Quick Metrics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Planned Budget"
          value={trip.budget === null ? "No budget set" : formatMoney(trip.budget)}
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <MetricCard
          label="Estimated Expenses"
          value={formatMoney(trip.estimatedExpenseTotal)}
          icon={<Compass className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-50"
        />
        <MetricCard
          label="Scheduled Activities"
          value={String(activityCount)}
          icon={<ListTodo className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
      </section>

      {/* Scheduling Intelligence Conflict Warning */}
      {issueCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-amber-950 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">
                Scheduling Intelligence: {issueCount} potential conflict{issueCount === 1 ? "" : "s"} detected
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Overlapping time slots, invalid intervals, or out-of-range dates need attention.
              </p>
            </div>
          </div>
          <Link to={`/trips/${trip.id}/builder`} className="shrink-0">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 font-bold text-white">
              Review & Fix Conflicts
            </Button>
          </Link>
        </div>
      )}

      {/* Cities / Route Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Destinations
            </span>
            <h2 className="text-xl font-bold text-slate-900">Cities on this Trip</h2>
          </div>
          <Link to={`/trips/${trip.id}/cities`}>
            <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add City
            </Button>
          </Link>
        </div>

        {trip.stops.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.stops.map((stop) => (
              <div
                key={stop.id}
                className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm">
                  {stop.city.image ? (
                    <img src={stop.city.image} alt={stop.city.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{stop.city.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{stop.city.country}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No cities added to your route yet"
            description="Explore destination cities to build your trip itinerary."
            icon={<MapPin className="h-7 w-7 text-sky-600" />}
            actionLabel="Explore Cities"
            onAction={() => window.location.assign(`/trips/${trip.id}/cities`)}
          />
        )}
      </section>

      {/* Callout Card */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50/50 p-6 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-800 font-bold">
            <Sparkles className="h-4 w-4" /> Ready to build your daily timeline?
          </div>
          <p className="text-sm text-slate-600">
            Organize activities day-by-day, set time slots, and monitor your costs.
          </p>
        </div>
        <Link to={`/trips/${trip.id}/builder`} className="shrink-0">
          <Button variant="primary" size="md">
            Open Itinerary Builder
          </Button>
        </Link>
      </section>

      {/* AI Trip Optimizer Modal */}
      <TripOptimizerModal
        isOpen={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        tripId={trip.id}
        tripName={trip.name}
        initialStartDate={trip.startDate}
        initialEndDate={trip.endDate}
        initialBudget={trip.budget}
        initialDestination={trip.stops.map((s) => s.city.name).join(", ")}
        onSuccess={() => {
          setOptimizerOpen(false);
          load();
        }}
      />
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}) => (
  <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 truncate">{value}</p>
    </div>
  </article>
);
