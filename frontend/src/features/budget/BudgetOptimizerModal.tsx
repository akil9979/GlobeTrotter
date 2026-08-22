import React, { useEffect, useState } from "react";
import { ApiError, apiClient } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import {
  Sparkles,
  Hotel,
  Compass,
  Utensils,
  Car,
  AlertTriangle,
  Check,
  X,
  TrendingDown,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import type {
  AppliedOptimizationItem,
  BudgetOptimizationRecommendation,
  BudgetOptimizationResponse,
  OptimizationCategory,
} from "../../types/budgetOptimizer";

export interface BudgetOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onSuccess?: () => void;
}

const formatMoney = (amount: number | null) =>
  amount === null
    ? "No limit"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount);

const categoryIcons: Record<OptimizationCategory, React.ReactNode> = {
  accommodation: <Hotel className="h-4 w-4 text-indigo-600" />,
  activities: <Compass className="h-4 w-4 text-amber-600" />,
  meals: <Utensils className="h-4 w-4 text-rose-600" />,
  transport: <Car className="h-4 w-4 text-sky-600" />,
};

const categoryLabels: Record<OptimizationCategory, string> = {
  accommodation: "Accommodation",
  activities: "Activities",
  meals: "Meals & Dining",
  transport: "Transport",
};

export const BudgetOptimizerModal: React.FC<BudgetOptimizerModalProps> = ({
  isOpen,
  onClose,
  tripId,
  onSuccess,
}) => {
  const [data, setData] = useState<BudgetOptimizationResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptimizations = async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ optimization: BudgetOptimizationResponse }>(
        `/trips/${tripId}/budget-optimization`
      );
      setData(res.optimization);
      // Auto-select all recommendations by default for quick review
      setSelectedIds(new Set(res.optimization.recommendations.map((r) => r.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load budget optimization analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadOptimizations();
    }
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.recommendations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.recommendations.map((r) => r.id)));
    }
  };

  const selectedRecommendations = data?.recommendations.filter((r) => selectedIds.has(r.id)) ?? [];
  const selectedSavings = selectedRecommendations.reduce((sum, r) => sum + r.potentialSavings, 0);

  const handleApply = async () => {
    if (!data || selectedRecommendations.length === 0) return;

    setIsApplying(true);
    setError(null);

    const appliedItems: AppliedOptimizationItem[] = selectedRecommendations.map((r) => ({
      targetType: r.targetType,
      targetId: r.targetId,
      proposedAmount: r.proposedAmount,
    }));

    try {
      await apiClient(`/trips/${tripId}/budget-optimization/apply`, {
        method: "POST",
        body: JSON.stringify({
          selectedRecommendationIds: Array.from(selectedIds),
          appliedItems,
        }),
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to apply budget optimizations.");
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
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 z-10 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                <TrendingDown className="h-3.5 w-3.5" /> Budget Optimizer
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Trip Cost Reduction Engine
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Data-driven savings recommendations based on your actual itinerary activities and expenses.
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

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
              <p className="text-sm font-semibold text-slate-600">
                Analyzing trip expenses & scheduled activities for savings opportunities...
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Feasibility Overview Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Current Cost
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatMoney(data.currentCost)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Target Budget
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatMoney(data.targetBudget)}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                    Savings Required
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-rose-700 mt-0.5">
                    {formatMoney(data.savingsRequired)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Selected Savings
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatMoney(selectedSavings)}
                  </p>
                </div>
              </div>

              {/* Status Alert */}
              {data.isOverBudget ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900 font-medium">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>
                      Applying the selected adjustments will recover{" "}
                      <b>{formatMoney(selectedSavings)}</b> of your{" "}
                      <b>{formatMoney(data.savingsRequired)}</b> budget deficit.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-900 font-medium">
                  <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>
                    <b>Your trip is currently within budget!</b> No mandatory savings are required.
                  </span>
                </div>
              )}

              {/* Recommendations Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Savings Opportunities ({data.recommendations.length})
                  </h3>

                  {data.recommendations.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors"
                    >
                      {selectedIds.size === data.recommendations.length ? (
                        <>
                          <CheckSquare className="h-3.5 w-3.5" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="h-3.5 w-3.5" /> Select All
                        </>
                      )}
                    </button>
                  )}
                </div>

                {data.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {data.recommendations.map((rec) => {
                      const isSelected = selectedIds.has(rec.id);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => toggleSelect(rec.id)}
                          className={`cursor-pointer rounded-2xl border p-4.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-100 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="pt-0.5 shrink-0">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </div>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                  {categoryIcons[rec.category]}
                                  <span>{categoryLabels[rec.category]}</span>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">{rec.title}</h4>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {rec.description}
                              </p>
                              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 font-medium">
                                <span>Current: {formatMoney(rec.currentAmount)}</span>
                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                <span className="font-bold text-emerald-700">
                                  Optimized: {formatMoney(rec.proposedAmount)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            <Badge variant="emerald" size="md" className="font-extrabold">
                              Save {formatMoney(rec.potentialSavings)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No active high-cost expenses or activities available to optimize on this trip.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button variant="outline" type="button" onClick={onClose} disabled={isApplying}>
            Close
          </Button>

          {data && data.recommendations.length > 0 && (
            <Button
              variant="primary"
              type="button"
              size="lg"
              isLoading={isApplying}
              disabled={selectedRecommendations.length === 0}
              onClick={handleApply}
              leftIcon={<Check className="h-4 w-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md"
            >
              Apply Selected Savings ({formatMoney(selectedSavings)})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
