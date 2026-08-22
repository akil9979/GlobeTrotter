export type SchedulingIssueType =
  | "OVERLAP"
  | "INVALID_TIME"
  | "OUTSIDE_STOP_DATES"
  | "OUTSIDE_TRIP_DATES"
  | "IMPOSSIBLE_TRANSITION"
  | "EXCESSIVE_DENSITY";

export type SchedulingIssueSeverity = "error" | "warning" | "info";

export type ResolutionActionType =
  | "UPDATE_ACTIVITY_TIME"
  | "UPDATE_ACTIVITY_DATE"
  | "UPDATE_ACTIVITY_SCHEDULE";

export type ResolutionAction = {
  type: ResolutionActionType;
  activityId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  tripStopId?: string;
};

export type SchedulingIssue = {
  id: string;
  type: SchedulingIssueType;
  severity: SchedulingIssueSeverity;
  message: string;
  date: string;
  affectedActivityId?: string;
  affectedActivityName?: string;
  conflictingActivityId?: string;
  conflictingActivityName?: string;
  suggestion?: string;
  resolutionAction?: ResolutionAction;
};

export type SchedulingIntelligenceResponse = {
  hasIssues: boolean;
  errorCount: number;
  warningCount: number;
  issues: SchedulingIssue[];
};

export type ResolveSchedulingIssueInput = {
  action: ResolutionAction;
};
