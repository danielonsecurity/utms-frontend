// ModularTaskTrackerTypes.ts

/**
 * Defines the static properties of a single modular task.
 * These are configured by the user.
 */
export interface ModuleDefinition {
  id: string; // Unique identifier for this module within the widget instance
  name: string; // e.g., "Vacuum Bedroom"
  location: string; // e.g., "Bedroom", "Kitchen", "General"
  effort: number; // A numerical representation of effort (e.g., 1-5)
  frequencyDays: number; // How often this task should be done, in days
  notes?: string; // Optional user notes for the task
}

/**
 * The configuration object for the Modular Task Tracker widget.
 * This is what gets saved and loaded by the dashboard framework.
 */
export interface ModularTaskTrackerConfig {
  widgetTitle: string; // Overall name for this set of tasks, e.g., "Apartment Cleaning"
  modules: ModuleDefinition[]; // The list of all defined tasks
  defaultStrategy: "decay" | "effort_first" | "manual"; // How to prioritize tasks
  defaultView: "list" | "by_location"; // Default display mode
  sessionEffortThreshold: number; // Max total effort for a suggested session
  allowSnooze: boolean; // Whether tasks can be snoozed
  snoozeDurationDays: number; // Default snooze duration in days
}

/**
 * Stores the dynamic runtime state for a single module.
 * This data is typically managed by the widget display component and persisted (e.g., in localStorage).
 */
export interface ModuleRuntimeState {
  lastCompletedDate: string | null; // ISO date string, e.g., "2023-10-27T10:00:00.000Z"
  snoozedUntilDate: string | null; // ISO date string, if the task is snoozed
}

/**
 * Combines a ModuleDefinition with its ModuleRuntimeState and calculated properties
 * for easier use in the display component.
 */
export interface EnrichedModule extends ModuleDefinition {
  runtimeState: ModuleRuntimeState;
  dueDate: Date | null; // Calculated due date based on lastCompletedDate and frequencyDays
  isOverdue: boolean; // True if current date is past dueDate
  daysUntilDue: number; // Positive if due in future, 0 if due today, negative if overdue.
  // This can be used for sorting by urgency.
  effectiveDueDate: Date | null; // Considers snooze date; this is what "isOverdue" and "daysUntilDue" should be based on.
}

// Utility type for the map storing runtime states for all modules in a widget instance
export type ModuleRuntimeStateMap = Record<string, ModuleRuntimeState>; // Key is ModuleDefinition.id
