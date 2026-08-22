import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm"
  >
    <div className="flex items-center gap-3">
      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        className="shrink-0 border-rose-200 text-rose-800 hover:bg-rose-100"
      >
        Try Again
      </Button>
    )}
  </div>
);
