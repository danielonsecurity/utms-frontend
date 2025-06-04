// Potentially in a shared types file or within RoutineWidget.tsx
export interface RoutineStepConfig {
  id: string; // Unique identifier for this step within the routine
  name: string; // User-friendly name (from Lisp :ref, e.g., "drink_water")
  // ref: string; // If we want to keep the original idea of referencing a global UTMS entity
  optional: boolean;
  estimatedTime?: number; // in minutes or seconds
  // customCompletionLogic?: StepCompletionLogic; // For future: :binary, :timed, :conditional
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
  name: string; // e.g., "Morning Routine"
  symbol?: string; // e.g., "☀️", "🌙" (for symbolic indicator)

  startAnchor: StartAnchorConfig;
  timeWindow: TimeWindowConfig;
  steps: RoutineStepConfig[];
  completionCriteria: CompletionCriteriaConfig;

  // Fields from TimerConfig that might still be relevant
  soundEnabled?: boolean; // For completion/notifications
  notificationEnabled?: boolean; // For completion/reminders
  alarmSoundSrc?: string;

  // For future "Configurable Routine Modes" - keep simple for now
  // variant?: string; // e.g., "weekday", "weekend"
}
