import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "sky" | "emerald" | "amber" | "rose" | "slate" | "indigo";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "sky",
  size = "md",
  className = "",
}) => {
  const variants = {
    sky: "bg-sky-50 text-sky-700 border-sky-200/60",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    amber: "bg-amber-50 text-amber-800 border-amber-200/60",
    rose: "bg-rose-50 text-rose-700 border-rose-200/60",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
