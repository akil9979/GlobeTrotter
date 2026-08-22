export type ItineraryActivity = {
  id: string; activityId: string; name: string; category: string | null; startTime: string | null; endTime: string | null;
  durationMinutes: number | null; cost: number; notes: string | null; status: string; sortOrder: number;
};

export type ItineraryDay = {
  date: string;
  city: { id: string; name: string; country: string; stopOrder: number } | null;
  activities: ItineraryActivity[];
  dailyCost: { actualExpenses: number; estimatedActivities: number; totalCommitted: number };
};

export type Itinerary = {
  trip: { id: string; name: string; description: string | null; startDate: string; endDate: string; plannedBudget: number | null };
  days: ItineraryDay[];
  summary: { tripDays: number; totalSpent: number; estimatedActivityCost: number; tripTotal: number; plannedBudget: number | null; remainingBudget: number | null; isOverBudget: boolean; overBudgetAmount: number };
};
