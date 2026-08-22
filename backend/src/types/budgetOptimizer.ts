export type OptimizationCategory = "accommodation" | "activities" | "meals" | "transport";

export type BudgetOptimizationRecommendation = {
  id: string;
  category: OptimizationCategory;
  title: string;
  description: string;
  potentialSavings: number;
  targetType: "expense" | "activity";
  targetId: string;
  currentAmount: number;
  proposedAmount: number;
};

export type BudgetOptimizationResponse = {
  currentCost: number;
  targetBudget: number | null;
  savingsRequired: number;
  isOverBudget: boolean;
  totalPotentialSavings: number;
  recommendations: BudgetOptimizationRecommendation[];
};

export type AppliedOptimizationItem = {
  targetType: "expense" | "activity";
  targetId: string;
  proposedAmount: number;
};

export type ApplyBudgetOptimizationInput = {
  selectedRecommendationIds: string[];
  appliedItems: AppliedOptimizationItem[];
};
