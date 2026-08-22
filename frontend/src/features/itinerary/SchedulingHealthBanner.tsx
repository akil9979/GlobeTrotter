import React, { useState } from "react";
import { ApiError, apiClient } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type {
  ResolutionAction,
  SchedulingIntelligenceResponse,
  SchedulingIssue,
  SchedulingIssueType,
} from "../../types/schedulingIntelligence";

export interface SchedulingHealthBannerProps {
  tripId: string;
  intelligence: SchedulingIntelligenceResponse | null;
  isLoading?: boolean;
  onResolved: () => void;
}

const typeLabels: Record<SchedulingIssueType, string> = {
  OVERLAP: "Time Overlap",
  INVALID_TIME: "Invalid Time Interval",
  OUTSIDE_STOP_DATES: "Outside Stop Dates",
  OUTSIDE_TRIP_DATES: "Outside Trip Dates",
  IMPOSSIBLE_TRANSITION: "Tight Transit Transition",
  EXCESSIVE_DENSITY: "High Day Density",
};

export const SchedulingHealthBanner: React.FC<SchedulingHealthBannerProps> = ({
  tripId,
  intelligence,
  isLoading = false,
  onResolved,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !intelligence) return null;

  if (!intelligence.hasIssues) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4 text-sm text-emerald-900 shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            Schedule is healthy! No time overlaps, invalid intervals, or date conflicts detected.
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
          Optimized
        </span>
      </div>
    );
  }

  const handleApplyResolution = async (issueId: string, action: ResolutionAction) => {
    setResolvingId(issueId);
    setError(null);
    try {
      await apiClient(`/trips/${tripId}/scheduling-intelligence/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      onResolved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to apply scheduling resolution.");
    } finally {
      setResolvingId(null);
    }
  };

  const hasErrors = intelligence.errorCount > 0;

  return (
    <div
      className={`rounded-3xl border transition-all overflow-hidden shadow-card ${
        hasErrors
          ? "border-rose-200 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/40"
          : "border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40"
      }`}
    >
      {/* Banner Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              hasErrors ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {hasErrors ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Scheduling Intelligence Detected {intelligence.issues.length} Issue
                {intelligence.issues.length === 1 ? "" : "s"}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {intelligence.errorCount > 0 && (
                <span className="font-bold text-rose-700 mr-2">
                  {intelligence.errorCount} Error{intelligence.errorCount === 1 ? "" : "s"}
                </span>
              )}
              {intelligence.warningCount > 0 && (
                <span className="font-bold text-amber-700">
                  {intelligence.warningCount} Warning{intelligence.warningCount === 1 ? "" : "s"}
                </span>
              )}
              {" — "}
              Review suggested resolutions to maintain an organized timeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>{isExpanded ? "Hide Details" : "Review Issues"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Issues Drawer */}
      {isExpanded && (
        <div className="border-t border-slate-200/80 p-5 sm:p-6 space-y-4 bg-white/70">
          {error && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-1">
            {intelligence.issues.map((issue) => {
              const isError = issue.severity === "error";
              const isResolving = resolvingId === issue.id;

              return (
                <div
                  key={issue.id}
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isError
                      ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                      : "border-amber-200 bg-amber-50/40 hover:border-amber-300"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isError ? "rose" : "amber"} size="sm" className="font-extrabold uppercase">
                        {isError ? "Error" : "Warning"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {typeLabels[issue.type] || issue.type}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Date: <b>{issue.date}</b>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {issue.message}
                    </p>

                    {issue.suggestion && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-white/90 rounded-xl p-2.5 border border-slate-200/80">
                        <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                        <span>
                          <b>Suggested Fix:</b> {issue.suggestion}
                        </span>
                      </div>
                    )}
                  </div>

                  {issue.resolutionAction && (
                    <div className="shrink-0 self-end sm:self-center">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isResolving}
                        onClick={() => handleApplyResolution(issue.id, issue.resolutionAction!)}
                        leftIcon={<Zap className="h-3.5 w-3.5" />}
                        className={`${
                          isError
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-amber-600 hover:bg-amber-700"
                        } text-white font-bold shadow-sm`}
                      >
                        Accept Fix
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
