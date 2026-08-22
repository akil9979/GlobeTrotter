import React from "react";

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

export const TripCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card flex flex-col justify-between">
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-2/3 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
    </div>
    <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center">
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center space-x-4 py-3 border-b border-slate-100">
    <Skeleton className="h-5 w-5 rounded-full" />
    <Skeleton className="h-4 flex-1 rounded" />
    <Skeleton className="h-4 w-24 rounded" />
    <Skeleton className="h-4 w-16 rounded" />
  </div>
);
