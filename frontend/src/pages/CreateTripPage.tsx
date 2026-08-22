import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import {
  MapPin,
  Calendar,
  IndianRupee,
  ArrowLeft,
  Sparkles,
  Search,
  Loader2,
  X,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";

type CityResult = {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  image?: string | null;
};

type TripResponse = { trip: { id: string } };
type FieldErrors = Partial<Record<"destination" | "startDate" | "endDate" | "budget", string>>;

// Popular quick-pick destinations
const POPULAR = [
  { name: "Goa", emoji: "🏖️" },
  { name: "Jaipur", emoji: "🏯" },
  { name: "Paris", emoji: "🗼" },
  { name: "Tokyo", emoji: "🗾" },
  { name: "Dubai", emoji: "🌆" },
  { name: "Bali", emoji: "🌴" },
];

export const CreateTripPage = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // City autocomplete state
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Trip form state
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounced city search
  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (!trimmed || selectedCity) {
      setSuggestions([]);
      setDropdownOpen(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => {
      apiClient<{ cities: CityResult[] }>(`/cities?search=${encodeURIComponent(trimmed)}&limit=6`)
        .then((res) => {
          setSuggestions(res.cities || []);
          setDropdownOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setIsSearching(false));
    }, 150);
    return () => clearTimeout(t);
  }, [cityQuery, selectedCity]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCity = (city: CityResult) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setDropdownOpen(false);
    // Auto-fill trip name
    if (!tripName) setTripName(`My Trip to ${city.name}`);
  };

  const clearCity = () => {
    setSelectedCity(null);
    setCityQuery("");
    setTripName("");
    setSuggestions([]);
  };

  const highlightMatch = (text: string, query: string) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1 || !query) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-amber-100 text-amber-900 font-black px-0.5 rounded">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  const submit = async () => {
    const next: FieldErrors = {};
    if (!selectedCity) next.destination = "Please search and select a city.";
    if (!startDate) next.startDate = "Choose a start date.";
    if (!endDate) next.endDate = "Choose an end date.";
    if (startDate && endDate && endDate < startDate) next.endDate = "End date must be on or after start date.";
    if (budget && (isNaN(Number(budget)) || Number(budget) < 0)) next.budget = "Budget cannot be negative.";

    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      // 1. Create the trip
      const { trip } = await apiClient<TripResponse>("/trips", {
        method: "POST",
        body: JSON.stringify({
          name: tripName || `My Trip to ${selectedCity!.name}`,
          startDate,
          endDate,
          budget: budget ? Number(budget) : null,
          description: `Trip to ${selectedCity!.name}, ${selectedCity!.country}.`,
        }),
      });

      // 2. Immediately add the city as the first stop
      await apiClient(`/trips/${trip.id}/stops`, {
        method: "POST",
        body: JSON.stringify({
          cityId: selectedCity!.id,
          arrivalDate: startDate,
          departureDate: endDate,
          stopOrder: 1,
        }),
      });

      // 3. Navigate directly to the itinerary builder (activities auto-load)
      navigate(`/trips/${trip.id}/builder`, { replace: true });
    } catch (reason) {
      setServerError(reason instanceof ApiError ? reason.message : "Unable to create your trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Trips
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-card sm:p-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#38bdf8,transparent_60%)]" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20">
            <Sparkles className="h-3.5 w-3.5" /> New Trip
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-white">
            Where are you going?
          </h1>
          <p className="text-sm text-slate-300">
            Type a city below — we'll suggest it instantly and auto-load real activities with live pricing.
          </p>
        </div>
      </section>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-6 sm:p-8">
        {serverError && <ErrorState message={serverError} />}

        {/* ── CITY SEARCH ── */}
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-bold text-slate-800 mb-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-sky-600" />
              Destination City <span className="text-rose-500">*</span>
            </span>
          </label>

          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 text-slate-400">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <input
              autoFocus
              type="text"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                if (selectedCity) setSelectedCity(null);
              }}
              placeholder="Type city name e.g. 'jai' for Jaipur, 'goa', 'par' for Paris..."
              className={`w-full rounded-2xl border pl-10 pr-10 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all ${
                errors.destination
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : selectedCity
                  ? "border-emerald-400 bg-emerald-50/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  : "border-slate-300 bg-slate-50/50 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
              }`}
            />
            <div className="absolute right-3.5 flex items-center gap-1">
              {selectedCity && (
                <span className="text-emerald-600 mr-1">
                  <Check className="h-4 w-4" />
                </span>
              )}
              {cityQuery && (
                <button
                  type="button"
                  onClick={clearCity}
                  className="text-slate-400 hover:text-slate-700 rounded-full p-0.5 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown */}
          {dropdownOpen && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1">
              <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-sky-500" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Live API Suggestions
                </span>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((city) => (
                  <li
                    key={city.id}
                    onClick={() => selectCity(city)}
                    className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-sky-50 transition-colors"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      {city.image ? (
                        <img src={city.image} alt={city.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                        {highlightMatch(city.name, cityQuery)}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {city.region ? `${city.region}, ` : ""}{city.country}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all -translate-x-1 opacity-0 group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No results */}
          {dropdownOpen && !isSearching && cityQuery.trim().length >= 2 && suggestions.length === 0 && (
            <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white shadow-xl p-4 text-center text-sm text-slate-500 animate-in fade-in-50">
              No cities found for "<strong>{cityQuery}</strong>"
            </div>
          )}

          {errors.destination && (
            <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.destination}</span>
          )}

          {/* Popular quick picks */}
          {!selectedCity && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Popular:</span>
              {POPULAR.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setCityQuery(p.name);
                    setIsSearching(true);
                    apiClient<{ cities: CityResult[] }>(`/cities?search=${encodeURIComponent(p.name)}&limit=3`)
                      .then((res) => {
                        const match = res.cities?.find((c) => c.name.toLowerCase() === p.name.toLowerCase()) || res.cities?.[0];
                        if (match) selectCity(match);
                      })
                      .finally(() => setIsSearching(false));
                  }}
                  className="rounded-xl bg-slate-100 hover:bg-sky-100 hover:text-sky-800 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors"
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Selected city confirmation chip */}
          {selectedCity && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{selectedCity.name}, {selectedCity.country}</span>
              <span className="ml-auto text-xs font-normal text-emerald-600">Activities will auto-load ✨</span>
            </div>
          )}
        </div>

        {/* ── TRIP NAME ── */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2" htmlFor="trip-name">
            Trip Name
          </label>
          <input
            id="trip-name"
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder={selectedCity ? `My Trip to ${selectedCity.name}` : "e.g. Summer Goa Vacation"}
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
          />
        </div>

        {/* ── DATES ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="start-date">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="start-date"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                  errors.startDate
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                }`}
              />
            </div>
            {errors.startDate && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.startDate}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="end-date">
              End Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="end-date"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                  errors.endDate
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                }`}
              />
            </div>
            {errors.endDate && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.endDate}</span>}
          </div>
        </div>

        {/* ── BUDGET ── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="trip-budget">
            Budget <span className="font-normal text-slate-400">(₹ INR, optional)</span>
          </label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="trip-budget"
              type="number"
              min="0"
              step="500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 50000"
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                errors.budget
                  ? "border-rose-300 bg-rose-50/50"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.budget && <span className="mt-1 block text-xs text-rose-600 font-medium">{errors.budget}</span>}
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={() => navigate("/trips")}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={submitting}
            onClick={submit}
            disabled={!selectedCity}
            leftIcon={!submitting ? <Zap className="h-4 w-4 text-yellow-200" /> : undefined}
            className="bg-gradient-to-r from-sky-600 via-indigo-600 to-slate-900 font-bold shadow-md min-w-[180px]"
          >
            {submitting ? "Creating Trip..." : `Create Trip to ${selectedCity?.name ?? "..."}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
