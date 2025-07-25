export interface RoutineStepConfig {
  id: string;
  name: string;
  optional: boolean;
  estimatedTime?: number;
  action?: string; // e.g., "(log-metric \"health\" \"Brush Teeth\" True)"
}

export type StartAnchorType = "relative" | "absolute_time" | "none";

export interface StartAnchorConfig {
  type: StartAnchorType;
  // For 'relative'
  relativeToAnchorId?: string; // e.g., "wake_time", "sunrise" (references other UTMS anchors)
  offsetMinutes?: number; // e.g., +15, -30
  // For 'absolute_time'
  fixedTime?: string; // e.g., "07:00"
}

export interface TimeWindowConfig {
  start: string; // e.g., "05:00"
  end: string; // e.g., "09:00"
}

export type CompletionCriteriaType =
  | "threshold"
  | "all_required"
  | "percentage";

export interface CompletionCriteriaConfig {
  type: CompletionCriteriaType;
  // For 'threshold'
  minSteps?: number;
  mandatoryStepIds?: string[]; // Array of RoutineStepConfig.id
  // For 'percentage'
  minPercentage?: number; // e.g., 80
}

// This is the main config for the widget instance
export interface RoutineConfig {
  entityName?: string; // The name of the routine entity, e.g., "Morning Routine"

  name: string;
  symbol?: string;

  startAnchor: StartAnchorConfig;
  timeWindow: TimeWindowConfig;
  steps: RoutineStepConfig[];
  completionCriteria: CompletionCriteriaConfig;

  soundEnabled?: boolean;
  notificationEnabled?: boolean;
  alarmSoundSrc?: string;
}
