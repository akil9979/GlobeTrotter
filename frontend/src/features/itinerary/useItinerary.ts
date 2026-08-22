import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import type { Itinerary, ItineraryActivity } from "./types";

export const useItinerary = (tripId?: string) => {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(tripId));
  const [isSaving, setIsSaving] = useState(false);
  const load = useCallback(async () => {
    if (!tripId) { setError("Trip not found."); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try { setItinerary((await apiClient<{ itinerary: Itinerary }>(`/trips/${tripId}/itinerary`)).itinerary); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load this itinerary."); }
    finally { setIsLoading(false); }
  }, [tripId]);
  useEffect(() => { void load(); }, [load]);
  const save = async (action: () => Promise<unknown>) => {
    if (!tripId) return; setIsSaving(true); setError(null);
    try { await action(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save itinerary changes."); }
    finally { setIsSaving(false); }
  };
  const updateActivity = (activityId: string, input: Pick<ItineraryActivity, "startTime" | "endTime" | "cost">) =>
    save(() => apiClient(`/trips/${tripId}/activities/${activityId}`, { method: "PUT", body: JSON.stringify({ startTime: input.startTime, endTime: input.endTime, customCost: input.cost }) }));
  const reorderDayActivities = (day: Itinerary["days"][number], sourceId: string, targetId: string) => {
    if (!itinerary || sourceId === targetId) return;
    const orderedDay = [...day.activities]; const source = orderedDay.findIndex((item) => item.id === sourceId); const target = orderedDay.findIndex((item) => item.id === targetId);
    if (source < 0 || target < 0) return;
    const [moved] = orderedDay.splice(source, 1); orderedDay.splice(target, 0, moved);
    const replacement = new Map(orderedDay.map((item, index) => [item.id, index + 1]));
    const all = itinerary.days.flatMap((item) => item.activities).map((item, index) => ({ id: item.id, order: replacement.get(item.id) ?? index + 1 }));
    void save(() => apiClient(`/trips/${tripId}/activities/reorder`, { method: "PATCH", body: JSON.stringify({ items: all }) }));
  };
  return { itinerary, error, isLoading, isSaving, load, updateActivity, reorderDayActivities };
};
