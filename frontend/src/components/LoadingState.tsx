import React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = "Loading travel data…",
  className = "",
}) => (
  <div className={`flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center text-slate-500 ${className}`}>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-subtle">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
    <span className="text-sm font-medium text-slate-600">{label}</span>
  </div>
);
