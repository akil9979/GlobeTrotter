import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import {
  Compass,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

type TripResponse = { trip: { id: string } };
type FieldErrors = Partial<
  Record<"name" | "startDate" | "endDate" | "budget" | "coverImage", string>
>;

export const CreateTripPage = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const startDate = String(form.get("startDate"));
    const endDate = String(form.get("endDate"));
    const description = String(form.get("description")).trim();
    const budgetValue = String(form.get("budget"));
    const coverImage = String(form.get("coverImage")).trim();
    const nextErrors: FieldErrors = {};

    if (!name) nextErrors.name = "Give your trip a name.";
    if (!startDate) nextErrors.startDate = "Choose a start date.";
    if (!endDate) nextErrors.endDate = "Choose an end date.";
    if (startDate && endDate && endDate < startDate)
      nextErrors.endDate = "The end date must be on or after the start date.";
    if (budgetValue && (Number.isNaN(Number(budgetValue)) || Number(budgetValue) < 0))
      nextErrors.budget = "Budget cannot be negative.";
    if (coverImage) {
      try {
        new URL(coverImage);
      } catch {
        nextErrors.coverImage = "Enter a valid image URL (e.g. https://...).";
      }
    }

    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const { trip } = await apiClient<TripResponse>("/trips", {
        method: "POST",
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          description: description || undefined,
          budget: budgetValue ? Number(budgetValue) : null,
          coverImage: coverImage || undefined,
        }),
      });
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (reason) {
      setServerError(
        reason instanceof ApiError ? reason.message : "Unable to create your trip. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/trips"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Trips
        </Link>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-card sm:p-8">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20">
            <Sparkles className="h-3.5 w-3.5" /> Step 1 of Trip Planning
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-white">
            Plan a New Journey
          </h1>
          <p className="text-sm text-slate-300">
            Define your travel dates and budget limit. You can add destinations and daily activities next.
          </p>
        </div>
      </section>

      {/* Form Card */}
      <form
        noValidate
        onSubmit={submit}
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-5 sm:p-8"
      >
        {serverError && <ErrorState message={serverError} />}

        {/* Trip Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="trip-name">
            Trip Title
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Compass className="h-4 w-4" />
            </div>
            <input
              id="trip-name"
              autoFocus
              required
              name="name"
              placeholder="e.g. Summer Vacation in Italy"
              aria-invalid={Boolean(errors.name)}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.name
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.name && (
            <span className="mt-1 block text-xs font-medium text-rose-600">{errors.name}</span>
          )}
        </div>

        {/* Date Range */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="start-date">
              Start Date
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                id="start-date"
                required
                type="date"
                name="startDate"
                aria-invalid={Boolean(errors.startDate)}
                className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                  errors.startDate
                    ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                }`}
              />
            </div>
            {errors.startDate && (
              <span className="mt-1 block text-xs font-medium text-rose-600">{errors.startDate}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="end-date">
              End Date
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                id="end-date"
                required
                type="date"
                name="endDate"
                aria-invalid={Boolean(errors.endDate)}
                className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                  errors.endDate
                    ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                }`}
              />
            </div>
            {errors.endDate && (
              <span className="mt-1 block text-xs font-medium text-rose-600">{errors.endDate}</span>
            )}
          </div>
        </div>

        {/* Planned Budget */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="trip-budget">
            Planned Budget <span className="font-normal text-slate-400">(USD, optional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <input
              id="trip-budget"
              type="number"
              name="budget"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="e.g. 3000"
              aria-invalid={Boolean(errors.budget)}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                errors.budget
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.budget && (
            <span className="mt-1 block text-xs font-medium text-rose-600">{errors.budget}</span>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="trip-description">
            Trip Notes / Highlights <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute top-3 left-3 text-slate-400">
              <FileText className="h-4 w-4" />
            </div>
            <textarea
              id="trip-description"
              name="description"
              rows={3}
              placeholder="Key notes, flights details, or packing reminders..."
              className="block w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all resize-y"
            />
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="cover-image">
            Cover Image URL <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <ImageIcon className="h-4 w-4" />
            </div>
            <input
              id="cover-image"
              type="url"
              name="coverImage"
              placeholder="https://images.unsplash.com/..."
              aria-invalid={Boolean(errors.coverImage)}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition-all ${
                errors.coverImage
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.coverImage && (
            <span className="mt-1 block text-xs font-medium text-rose-600">{errors.coverImage}</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={() => navigate("/trips")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={submitting}>
            Create Trip
          </Button>
        </div>
      </form>
    </div>
  );
};
