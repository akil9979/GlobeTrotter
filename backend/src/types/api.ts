export type TripInput = {
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  budget?: number | null;
  isPublic?: boolean;
};

export type StopInput = {
  cityId: string;
  stopOrder: number;
  arrivalDate: string;
  departureDate: string;
  notes?: string | null;
};

export type TripActivityInput = {
  tripStopId: string;
  activityId: string;
  activityDate: string;
  startTime?: string | null;
  endTime?: string | null;
  customCost?: number | null;
  status?: "planned" | "completed" | "cancelled";
  sortOrder?: number;
  notes?: string | null;
};

export type ExpenseInput = {
  tripStopId?: string | null;
  category: "transport" | "accommodation" | "activity" | "meal" | "other";
  description?: string | null;
  amount: number;
  expenseDate: string;
};

export type ReorderItem = { id: string; order: number };
