import React from "react";
import { Compass } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = "",
}) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center sm:p-12 ${className}`}>
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100/80 text-sky-700 shadow-sm mb-4">
      {icon || <Compass className="h-7 w-7" />}
    </div>
    <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-6">
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);
