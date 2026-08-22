import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import {
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  Compass,
  AlertTriangle,
  Check,
  ArrowRight,
  Clock,
  Car,
  Hotel,
  Utensils,
  Tag,
  X,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type {
  ApplyOptimizerResponse,
  TripOptimizerInput,
  ValidatedOptimizerRecommendation,
} from "../../types/optimizer";

export interface TripOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  tripName?: string;
  initialDestination?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialBudget?: number | null;
  onSuccess?: (tripId: string) => void;
}

const INTEREST_TAGS = [
  "Art & Museums",
  "Food & Wine",
  "Historic Landmarks",
  "Nature & Outdoors",
  "Photography",
  "Shopping & Markets",
  "Nightlife & Shows",
  "Hidden Gems",
  "Architecture",
  "Relaxation",
];

const ACTIVITY_TYPES = [
  { id: "sightseeing", label: "Sightseeing" },
  { id: "culture", label: "Culture & History" },
  { id: "food", label: "Food & Dining" },
  { id: "outdoor", label: "Outdoor & Adventure" },
  { id: "entertainment", label: "Entertainment" },
  { id: "shopping", label: "Shopping" },
];

const TRAVEL_STYLES = [
  { id: "balanced", label: "Balanced", desc: "Even mix of sightseeing, food, and free time" },
  { id: "relaxed", label: "Relaxed", desc: "Leisurely pace with 1-2 curated highlights per day" },
  { id: "packed", label: "Packed & Energetic", desc: "Action-packed days covering maximum highlights" },
  { id: "budget-friendly", label: "Budget Backpacker", desc: "Cost-effective activities & public transit" },
  { id: "luxury", label: "Luxury & Comfort", desc: "Premium experiences & fine dining" },
];

const POPULAR_CITIES = ["Paris", "Rome", "Tokyo", "Lisbon", "Barcelona", "London", "Kyoto"];

const formatMoney = (amount: number | null) =>
  amount === null
    ? "No limit"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const TripOptimizerModal: React.FC<TripOptimizerModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  initialDestination = "",
  initialStartDate = "",
  initialEndDate = "",
  initialBudget = null,
  onSuccess,
}) => {
  const navigate = useNavigate();

  // Form State
  const [destination, setDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState(
    initialStartDate || new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    initialEndDate || new Date(Date.now() + 86400000 * 11).toISOString().split("T")[0]
  );
  const [budget, setBudget] = useState<string>(initialBudget !== null && initialBudget !== undefined ? String(initialBudget) : "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Art & Museums", "Food & Wine"]);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([
    "sightseeing",
    "culture",
    "food",
  ]);
  const [travelStyle, setTravelStyle] = useState("balanced");

  // Flow & AI State
  const [step, setStep] = useState<"form" | "preview">("form");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [recommendation, setRecommendation] = useState<ValidatedOptimizerRecommendation | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleActivityType = (typeId: string) => {
    setSelectedActivityTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleQuickAddCity = (city: string) => {
    if (!destination.trim()) {
      setDestination(city);
    } else if (!destination.toLowerCase().includes(city.toLowerCase())) {
      setDestination(`${destination}, ${city}`);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError("Please specify at least one destination city.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please specify both start and end dates.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after start date.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const payload: TripOptimizerInput = {
        destination: destination.trim(),
        startDate,
        endDate,
        budget: budget ? Number(budget) : null,
        interests: selectedInterests,
        preferredActivityTypes: selectedActivityTypes,
        travelStyle,
        tripId,
        tripName,
      };

      const res = await apiClient<{ recommendation: ValidatedOptimizerRecommendation }>(
        "/ai/optimizer/generate",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setRecommendation(res.recommendation);
      setStep("preview");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate recommendations. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!recommendation) return;

    setError(null);
    setIsApplying(true);

    try {
      const res = await apiClient<ApplyOptimizerResponse>("/ai/optimizer/apply", {
        method: "POST",
        body: JSON.stringify({
          tripId,
          tripName,
          recommendation,
          overwriteExisting,
        }),
      });

      onClose();
      if (onSuccess) {
        onSuccess(res.tripId);
      } else {
        navigate(`/trips/${res.tripId}/builder`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("This trip already has stops. Check the overwrite box below to replace them.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to apply itinerary.");
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 z-10 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-950 text-white p-6 sm:p-7 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 px-3 py-1 text-xs font-bold text-sky-300 border border-sky-400/30">
                <Sparkles className="h-3.5 w-3.5" /> AI Trip Optimizer
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {step === "form" ? "Design Your Smart Itinerary" : "Structured AI Recommendations"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {step === "form"
                  ? "Set your preferences and our AI assistant will create a tailored, budget-conscious plan."
                  : "Review the day-by-day stops, activities, and budget feasibility before applying."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Destinations */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900" htmlFor="destination-input">
                  Destinations / Cities <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    id="destination-input"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Paris, Rome, Tokyo"
                    className="block w-full rounded-2xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all font-medium"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-400">Popular:</span>
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleQuickAddCity(city)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-sky-100 hover:text-sky-800 transition-colors"
                    >
                      + {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Budget Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="start-date-input">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      id="start-date-input"
                      required
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="end-date-input">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      id="end-date-input"
                      required
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="budget-input">
                    Planned Budget <span className="text-slate-400 font-normal">(USD)</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <input
                      id="budget-input"
                      type="number"
                      min="0"
                      step="50"
                      placeholder="e.g. 2000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              {/* Interests Tags */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-rose-500" /> Travel Interests & Themes
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map((tag) => {
                    const isSelected = selectedInterests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                        }`}
                      >
                        {tag} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Activity Types */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-sky-600" /> Preferred Activity Types
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ACTIVITY_TYPES.map((type) => {
                    const isChecked = selectedActivityTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => toggleActivityType(type.id)}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                          isChecked
                            ? "border-sky-500 bg-sky-50/70 text-sky-950 font-bold ring-2 ring-sky-100"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isChecked
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <span className="text-xs font-semibold">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Travel Style Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  Travel Style & Pace
                </label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {TRAVEL_STYLES.map((style) => {
                    const isSelected = travelStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setTravelStyle(style.id)}
                        className={`rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {style.label}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                          {style.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  type="submit"
                  size="lg"
                  isLoading={isGenerating}
                  leftIcon={<Sparkles className="h-4 w-4 text-sky-200" />}
                  className="bg-gradient-to-r from-sky-600 via-indigo-600 to-slate-900 shadow-md font-bold"
                >
                  {isGenerating ? "Analyzing & Optimizing..." : "Generate AI Itinerary"}
                </Button>
              </div>
            </form>
          ) : recommendation ? (
            /* PREVIEW STEP */
            <div className="space-y-6">
              {/* Warnings Banner */}
              {recommendation.warnings.length > 0 && (
                <div className="space-y-2">
                  {recommendation.warnings.map((warn, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs sm:text-sm text-amber-900 font-medium"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Budget Intelligence Card */}
              <div
                className={`rounded-3xl p-6 text-white shadow-card border ${
                  recommendation.budgetStatus.isOverBudget
                    ? "bg-gradient-to-r from-rose-900 via-slate-900 to-rose-950 border-rose-700/40"
                    : "bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Budget Feasibility Analysis
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-0.5">
                      Estimated Trip Cost: {formatMoney(recommendation.estimatedBudget.total)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {recommendation.budgetStatus.isOverBudget ? (
                      <Badge variant="rose" size="md" className="bg-rose-500/30 text-rose-200 border-rose-400/40 font-bold">
                        ⚠️ Over Budget by {formatMoney(recommendation.budgetStatus.overBudgetAmount)}
                      </Badge>
                    ) : (
                      <Badge variant="emerald" size="md" className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 font-bold">
                        ✓ Within Planned Budget
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Itemized Categories */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 text-xs">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Car className="h-3.5 w-3.5" /> Transport
                    </div>
                    <p className="mt-1 text-base font-extrabold text-white">
                      {formatMoney(recommendation.estimatedBudget.transport)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Hotel className="h-3.5 w-3.5" /> Lodging
                    </div>
                    <p className="mt-1 text-base font-extrabold text-white">
                      {formatMoney(recommendation.estimatedBudget.accommodation)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Compass className="h-3.5 w-3.5" /> Activities
                    </div>
                    <p className="mt-1 text-base font-extrabold text-white">
                      {formatMoney(recommendation.estimatedBudget.activities)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Utensils className="h-3.5 w-3.5" /> Meals
                    </div>
                    <p className="mt-1 text-base font-extrabold text-white">
                      {formatMoney(recommendation.estimatedBudget.meals)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Tag className="h-3.5 w-3.5" /> Other / Misc
                    </div>
                    <p className="mt-1 text-base font-extrabold text-white">
                      {formatMoney(recommendation.estimatedBudget.other)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Stops & Activities Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Day-by-Day Route & Scheduled Highlights
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {recommendation.stops.length} Stops •{" "}
                    {recommendation.stops.reduce((acc, s) => acc + s.activities.length, 0)} Activities
                  </span>
                </div>

                <div className="space-y-4">
                  {recommendation.stops.map((stop, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-4"
                    >
                      {/* Stop Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-xs font-extrabold text-sky-800">
                            {sIdx + 1}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">
                              {stop.city} {stop.country ? `(${stop.country})` : ""}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {formatDate(stop.startDate)} – {formatDate(stop.endDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {stop.matchedCity ? (
                            <Badge variant="emerald" size="sm">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Verified City
                            </Badge>
                          ) : (
                            <Badge variant="slate" size="sm">
                              New Destination
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Activities List */}
                      <div className="space-y-2.5">
                        {stop.activities.map((act, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">
                                  {act.name}
                                </span>
                                <Badge variant="slate" size="sm" className="capitalize text-[10px]">
                                  {act.category}
                                </Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span>{formatDate(act.date)}</span>
                                {act.startTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {act.startTime} {act.endTime ? `– ${act.endTime}` : ""}
                                  </span>
                                )}
                                <span className="font-semibold text-slate-700">
                                  {formatMoney(act.estimatedCost)}
                                </span>
                              </div>
                            </div>

                            {act.isExistingInDb && (
                              <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
                                ✓ In Catalog
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overwrite Confirmation (if applying to existing trip) */}
              {tripId && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      Replace and overwrite existing stops and activities in this trip
                    </span>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep("form")}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Adjust Parameters
                </Button>

                <Button
                  variant="primary"
                  type="button"
                  size="lg"
                  isLoading={isApplying}
                  onClick={handleApply}
                  leftIcon={<Check className="h-4 w-4 text-emerald-200" />}
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-md font-bold"
                >
                  {isApplying ? "Applying Itinerary..." : "Approve & Apply Itinerary"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
