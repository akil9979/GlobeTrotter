export type TripOptimizerInput = {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number | null;
  interests?: string[];
  preferredActivityTypes?: string[];
  travelStyle?: string;
  tripId?: string;
  tripName?: string;
};

export type ActivityRecommendation = {
  name: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  estimatedCost: number;
  category: string;
  description?: string | null;
  matchedActivityId?: string | null;
  isExistingInDb?: boolean;
};

export type StopRecommendation = {
  city: string;
  cityId: string | null;
  country?: string;
  image?: string | null;
  matchedCity?: {
    id: string;
    name: string;
    country: string;
    image: string | null;
  } | null;
  startDate: string;
  endDate: string;
  activities: ActivityRecommendation[];
};

export type BudgetEstimate = {
  transport: number;
  accommodation: number;
  activities: number;
  meals: number;
  other: number;
  total: number;
};

export type BudgetStatus = {
  userBudget: number | null;
  totalEstimated: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  remainingBudget: number | null;
};

export type ValidatedOptimizerRecommendation = {
  stops: StopRecommendation[];
  estimatedBudget: BudgetEstimate;
  budgetStatus: BudgetStatus;
  warnings: string[];
};

export type ApplyOptimizerInput = {
  tripId?: string;
  tripName?: string;
  recommendation: ValidatedOptimizerRecommendation;
  overwriteExisting?: boolean;
};

export type ApplyOptimizerResponse = {
  tripId: string;
  trip: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    budget: number | null;
  };
  message: string;
};
