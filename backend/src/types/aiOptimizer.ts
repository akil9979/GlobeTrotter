export type TripOptimizerInput = {
  destination: string | string[];
  startDate: string;
  endDate: string;
  budget?: number | null;
  interests?: string[];
  preferredActivityTypes?: string[];
  travelStyle?: string;
  tripId?: string;
  tripName?: string;
};

export type RawActivityRecommendation = {
  name: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  estimatedCost: number;
  category?: string;
  description?: string;
};

export type RawStopRecommendation = {
  city: string;
  startDate: string;
  endDate: string;
  activities: RawActivityRecommendation[];
};

export type RawBudgetEstimate = {
  transport: number;
  accommodation: number;
  activities: number;
  meals: number;
  other: number;
  total: number;
};

export type RawAIOptimizerOutput = {
  stops: RawStopRecommendation[];
  estimatedBudget: RawBudgetEstimate;
};

export type MatchedActivity = {
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

export type MatchedStop = {
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
  activities: MatchedActivity[];
};

export type BudgetStatus = {
  userBudget: number | null;
  totalEstimated: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  remainingBudget: number | null;
};

export type ValidatedOptimizerRecommendation = {
  stops: MatchedStop[];
  estimatedBudget: RawBudgetEstimate;
  budgetStatus: BudgetStatus;
  warnings: string[];
};

export type ApplyOptimizerInput = {
  tripId?: string;
  tripName?: string;
  recommendation: ValidatedOptimizerRecommendation;
  overwriteExisting?: boolean;
};
