import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { useItinerary } from "./useItinerary";
import type { ItineraryActivity, ItineraryDay } from "./types";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  MapPin,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertCircle,
  Sparkles,
  ListTodo,
} from "lucide-react";

type Mode = "timeline" | "calendar";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const displayDate = (value: string, includeYear = false) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });

const formatTimeRange = (activity: ItineraryActivity) =>
  activity.startTime
    ? `${activity.startTime.slice(0, 5)}${
        activity.endTime ? ` – ${activity.endTime.slice(0, 5)}` : ""
      }`
    : "Flexible time";

export const ItineraryExperience = ({ mode }: { mode: Mode }) => {
  const { tripId } = useParams();
  const state = useItinerary(tripId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ItineraryActivity | null>(null);

  if (state.isLoading && !state.itinerary) {
    return <LoadingState label="Loading itinerary experience..." />;
  }

  if (!state.itinerary) {
    return <ErrorState message={state.error ?? "Unable to load itinerary."} onRetry={() => void state.load()} />;
  }

  const { itinerary } = state;

  const toggleDay = (dateStr: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-floating sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20">
              <Sparkles className="h-3.5 w-3.5" />
              {mode === "timeline" ? "Itinerary Timeline" : "Schedule Calendar"}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              {itinerary.trip.name}
            </h1>
            <p className="text-sm text-slate-300">
              {displayDate(itinerary.trip.startDate, true)} – {displayDate(itinerary.trip.endDate, true)}{" "}
              • {itinerary.summary.tripDays} days planned
            </p>
          </div>

          <ViewSwitch tripId={itinerary.trip.id} mode={mode} />
        </div>

        <BudgetSummary
          tripTotal={itinerary.summary.tripTotal}
          budget={itinerary.summary.plannedBudget}
          remaining={itinerary.summary.remainingBudget}
          over={itinerary.summary.isOverBudget}
        />
      </section>

      {state.error && <ErrorState message={state.error} />}

      {itinerary.days.every((day) => day.activities.length === 0) && (
        <EmptyState
          title="Your itinerary timeline is empty"
          description="Add city stops and schedule activities in the Itinerary Builder to see your day-by-day plan."
          icon={<ListTodo className="h-8 w-8 text-sky-600" />}
          actionLabel="Open Builder"
          onAction={() => window.location.assign(`/trips/${itinerary.trip.id}/builder`)}
        />
      )}

      {mode === "timeline" ? (
        <Timeline
          days={itinerary.days}
          collapsed={collapsed}
          onToggle={toggleDay}
          saving={state.isSaving}
          onReorder={state.reorderDayActivities}
          onEdit={setEditing}
        />
      ) : (
        <CalendarView days={itinerary.days} saving={state.isSaving} onEdit={setEditing} />
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center text-xs text-slate-500 shadow-subtle">
        Total Trip Cost: <b className="text-slate-900">{formatMoney(itinerary.summary.tripTotal)}</b> •
        Activity Estimates: {formatMoney(itinerary.summary.estimatedActivityCost)} • Recorded Expenses:{" "}
        {formatMoney(itinerary.summary.totalSpent)}
      </div>

      {editing && (
        <QuickEditModal
          activity={editing}
          saving={state.isSaving}
          onCancel={() => setEditing(null)}
          onSave={(input) => {
            state.updateActivity(editing.id, input);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

const ViewSwitch = ({ tripId, mode }: { tripId: string; mode: Mode }) => (
  <div className="inline-flex rounded-xl bg-white/10 p-1 text-xs font-semibold backdrop-blur-sm">
    <Link
      to={`/trips/${tripId}/itinerary`}
      className={`rounded-lg px-3.5 py-2 transition-colors ${
        mode === "timeline" ? "bg-white text-slate-950 shadow-sm" : "text-slate-200 hover:text-white"
      }`}
    >
      Timeline View
    </Link>
    <Link
      to={`/trips/${tripId}/calendar`}
      className={`rounded-lg px-3.5 py-2 transition-colors ${
        mode === "calendar" ? "bg-white text-slate-950 shadow-sm" : "text-slate-200 hover:text-white"
      }`}
    >
      Calendar View
    </Link>
  </div>
);

const BudgetSummary = ({
  tripTotal,
  budget,
  remaining,
  over,
}: {
  tripTotal: number;
  budget: number | null;
  remaining: number | null;
  over: boolean;
}) => (
  <div
    className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium ${
      over ? "bg-rose-500/20 text-rose-100 border border-rose-400/30" : "bg-white/10 text-slate-200 border border-white/10"
    }`}
  >
    <div>
      <span className="text-slate-400">Total Allocated:</span> <b>{formatMoney(tripTotal)}</b>
    </div>
    {budget !== null && (
      <>
        <div>
          <span className="text-slate-400">Budget Limit:</span> <b>{formatMoney(budget)}</b>
        </div>
        <div className="font-bold">
          {over ? (
            <span className="text-rose-300">⚠️ {formatMoney(Math.abs(remaining ?? 0))} over budget</span>
          ) : (
            <span className="text-emerald-300">✓ {formatMoney(remaining ?? 0)} remaining</span>
          )}
        </div>
      </>
    )}
  </div>
);

const Timeline = ({
  days,
  collapsed,
  onToggle,
  saving,
  onReorder,
  onEdit,
}: {
  days: ItineraryDay[];
  collapsed: Set<string>;
  onToggle: (date: string) => void;
  saving: boolean;
  onReorder: (day: ItineraryDay, source: string, target: string) => void;
  onEdit: (activity: ItineraryActivity) => void;
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  let previousCity: string | null = null;

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const transition = day.city?.name !== previousCity;
        previousCity = day.city?.name ?? null;
        const isExpanded = !collapsed.has(day.date);

        return (
          <section
            key={day.date}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card"
          >
            {transition && (
              <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-5 py-3 text-xs font-bold text-sky-800">
                <MapPin className="h-4 w-4 text-sky-600" />
                {day.city ? (
                  <span>
                    City Stop {day.city.stopOrder}: {day.city.name}, {day.city.country}
                  </span>
                ) : (
                  <span>Travel Day (City not assigned)</span>
                )}
              </div>
            )}

            <button
              onClick={() => onToggle(day.date)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-xs text-slate-800">
                  {new Date(`${day.date}T00:00:00`).getDate()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{displayDate(day.date, true)}</h3>
                  <p className="text-xs text-slate-500">
                    {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"} • Daily Total:{" "}
                    {formatMoney(day.dailyCost.totalCommitted)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-sky-700">
                <span>{isExpanded ? "Collapse" : "Expand"}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4">
                {day.activities.length ? (
                  <div className="space-y-2.5">
                    {day.activities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        saving={saving}
                        draggable
                        onDragStart={() => setDragging(activity.id)}
                        onDrop={() => {
                          if (dragging) onReorder(day, dragging, activity.id);
                          setDragging(null);
                        }}
                        onEdit={onEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                    No activities scheduled for this date.
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const CalendarView = ({
  days,
  saving,
  onEdit,
}: {
  days: ItineraryDay[];
  saving: boolean;
  onEdit: (activity: ItineraryActivity) => void;
}) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
    <div className="grid min-w-[700px] grid-cols-7 border-b border-slate-200 bg-slate-50/80">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
        <p key={label} className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      ))}
    </div>
    <div className="grid min-w-[700px] grid-cols-7">
      {Array.from({ length: new Date(`${days[0].date}T00:00:00`).getDay() }).map((_, index) => (
        <div key={`empty-${index}`} className="min-h-36 border-b border-r border-slate-100 bg-slate-50/40" />
      ))}
      {days.map((day) => (
        <article key={day.date} className="min-h-36 border-b border-r border-slate-100 p-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-800">
                {new Date(`${day.date}T00:00:00`).getDate()}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatMoney(day.dailyCost.totalCommitted)}
              </span>
            </div>

            {day.city && (
              <p className="mt-1 truncate text-[11px] font-semibold text-sky-700">
                {day.city.name}
              </p>
            )}

            <div className="mt-2 space-y-1">
              {day.activities.slice(0, 3).map((activity) => (
                <button
                  key={activity.id}
                  disabled={saving}
                  onClick={() => onEdit(activity)}
                  className="block w-full truncate rounded-lg bg-sky-50 px-2 py-1 text-left text-[11px] font-medium text-sky-900 hover:bg-sky-100 transition-colors"
                >
                  <span className="font-bold">{activity.startTime?.slice(0, 5) ?? "Flex"}</span> {activity.name}
                </button>
              ))}
              {day.activities.length > 3 && (
                <p className="text-[11px] font-semibold text-slate-400 pl-1">
                  +{day.activities.length - 3} more
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const ActivityCard = ({
  activity,
  saving,
  draggable,
  onDragStart,
  onDrop,
  onEdit,
}: {
  activity: ItineraryActivity;
  saving: boolean;
  draggable: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onEdit: (activity: ItineraryActivity) => void;
}) => (
  <article
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={(event) => event.preventDefault()}
    onDrop={onDrop}
    className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-subtle transition-all duration-150 hover:border-sky-300 hover:shadow-card"
  >
    <div className="cursor-grab text-slate-300 hover:text-slate-600 transition-colors" title="Drag to reorder">
      <GripVertical className="h-5 w-5" />
    </div>

    <div className="min-w-0 flex-1">
      <h4 className="truncate font-bold text-slate-900 text-sm">{activity.name}</h4>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formatTimeRange(activity)}
        </span>
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          {formatMoney(activity.cost)}
        </span>
        {activity.durationMinutes && (
          <span className="text-slate-400">• {activity.durationMinutes} mins</span>
        )}
      </div>
    </div>

    <Button
      variant="ghost"
      size="sm"
      leftIcon={<Pencil className="h-3.5 w-3.5" />}
      disabled={saving}
      onClick={() => onEdit(activity)}
    >
      Edit
    </Button>
  </article>
);

const QuickEditModal = ({
  activity,
  saving,
  onCancel,
  onSave,
}: {
  activity: ItineraryActivity;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: Pick<ItineraryActivity, "startTime" | "endTime" | "cost">) => void;
}) => {
  const [startTime, setStartTime] = useState(activity.startTime ?? "");
  const [endTime, setEndTime] = useState(activity.endTime ?? "");
  const [cost, setCost] = useState(String(activity.cost));
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Boolean(startTime) !== Boolean(endTime)) {
      return setError("Please provide both start and end times, or leave both empty.");
    }
    if (startTime && endTime && endTime <= startTime) {
      return setError("End time must be later than start time.");
    }
    if (!cost || Number(cost) < 0) {
      return setError("Cost must be zero or positive.");
    }
    onSave({
      startTime: startTime || null,
      endTime: endTime || null,
      cost: Number(cost),
    });
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title={`Edit ${activity.name}`}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-start-time">
              Start Time
            </label>
            <input
              id="edit-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-end-time">
              End Time
            </label>
            <input
              id="edit-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-cost">
            Activity Cost (USD)
          </label>
          <input
            id="edit-cost"
            type="number"
            min="0"
            step="1"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Activity
          </Button>
        </div>
      </form>
    </Modal>
  );
};
