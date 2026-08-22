import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { Skeleton, TripCardSkeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import {
  Compass,
  Wallet,
  Receipt,
  PlusCircle,
  MapPin,
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  destinationCount: number;
  estimatedExpenseTotal: number;
};

type City = {
  id: string;
  name: string;
  country: string;
  description: string | null;
  image: string | null;
};

type Dashboard = {
  tripCount: number;
  budgetHighlights: {
    plannedBudget: number;
    estimatedExpenseTotal: number;
    actualExpenseTotal: number;
  };
  upcomingTrips: Trip[];
  recentTrips: Trip[];
};

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDateRange = (trip: Trip) => {
  const start = new Date(`${trip.startDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(`${trip.endDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

const TripRow = ({ trip }: { trip: Trip }) => (
  <Link
    to={`/trips/${trip.id}`}
    className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-150 hover:border-sky-300 hover:shadow-card"
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
        <MapPin className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
          {trip.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {formatDateRange(trip)}
          </span>
          <span>•</span>
          <span>
            {trip.destinationCount} {trip.destinationCount === 1 ? "destination" : "destinations"}
          </span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <Badge variant="sky" size="md">
        {money(trip.budget)}
      </Badge>
      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
    </div>
  </Link>
);

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <Skeleton className="h-44 w-full rounded-3xl" />
    <div className="grid gap-4 sm:grid-cols-3">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded" />
        <TripCardSkeleton />
        <TripCardSkeleton />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded" />
        <TripCardSkeleton />
        <TripCardSkeleton />
      </div>
    </div>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setError(null);
    setIsLoading(true);
    Promise.all([
      apiClient<{ dashboard: Dashboard }>("/dashboard"),
      apiClient<{ cities: City[] }>("/cities?limit=4"),
    ])
      .then(([d, c]) => {
        setDashboard(d.dashboard);
        setCities(c.cities);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const budget = dashboard!.budgetHighlights;
  const firstName = user?.name?.split(" ")[0] ?? "Traveler";

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-floating sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20">
              <Sparkles className="h-3.5 w-3.5" /> GlobeTrotter Control Center
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Welcome back, {firstName}.
            </h1>
            <p className="max-w-xl text-sm text-slate-300 leading-relaxed">
              Keep your upcoming journeys on schedule and monitor your overall travel budget in real time.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<PlusCircle className="h-5 w-5" />}
            onClick={() => navigate("/trips/new")}
            className="shrink-0 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold focus:ring-sky-300 shadow-md"
          >
            Plan New Trip
          </Button>
        </div>
      </section>

      {/* Highlights Metrics Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Compass className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-50"
          label="Trips Planned"
          value={String(dashboard!.tripCount)}
          note="Active & completed journeys"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Total Budget Limit"
          value={money(budget.plannedBudget)}
          note={`${money(budget.estimatedExpenseTotal)} planned activities`}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="Recorded Expenses"
          value={money(budget.actualExpenseTotal)}
          note="Logged across all itineraries"
        />
      </section>

      {/* Upcoming & Recent Trips */}
      <section className="grid gap-8 lg:grid-cols-2">
        <TripSection
          title="Upcoming Trips"
          trips={dashboard!.upcomingTrips}
          emptyTitle="No upcoming trips"
          emptyDescription="Start planning your next getaway with GlobeTrotter."
          onAction={() => navigate("/trips/new")}
        />
        <TripSection
          title="Recent Journeys"
          trips={dashboard!.recentTrips}
          emptyTitle="No trip history yet"
          emptyDescription="Your past itineraries will appear right here."
          onAction={() => navigate("/trips/new")}
        />
      </section>

      {/* Destination Recommendations */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Inspiration
            </span>
            <h2 className="text-xl font-bold text-slate-900">Explore Featured Cities</h2>
          </div>
          <Link
            to="/trips"
            className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
          >
            View all destinations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {cities.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cities.map((city) => (
              <article
                key={city.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all duration-150 hover:border-sky-300 hover:bg-white hover:shadow-subtle flex flex-col justify-between"
              >
                <div className="relative h-32 w-full overflow-hidden bg-slate-200">
                  {city.image ? (
                    <img
                      src={city.image}
                      alt={city.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <MapPin className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="slate" size="sm" className="bg-white/90 backdrop-blur-sm shadow-sm">
                      {city.country}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                      {city.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                      {city.description || "Discover sights, local dining, and hidden spots."}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recommended cities available"
            description="Explore our city directory to add destinations to your trip."
          />
        )}
      </section>
    </div>
  );
};

const StatCard = ({
  icon,
  iconBg,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  note: string;
}) => (
  <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400 truncate">{note}</p>
    </div>
  </article>
);

const TripSection = ({
  title,
  trips,
  emptyTitle,
  emptyDescription,
  onAction,
}: {
  title: string;
  trips: Trip[];
  emptyTitle: string;
  emptyDescription: string;
  onAction: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <Link to="/trips" className="text-sm font-semibold text-sky-700 hover:text-sky-800 hover:underline">
        View all
      </Link>
    </div>
    <div className="space-y-3">
      {trips.length ? (
        trips.map((trip) => <TripRow key={trip.id} trip={trip} />)
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel="Create a Trip"
          onAction={onAction}
        />
      )}
    </div>
  </div>
);
