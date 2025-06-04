// types.ts (Revised)
export type ActionTakenType =
  | "succumbed"
  | "resisted"
  | "redirected"
  | "unknown";

export interface EventLoopEntry {
  id: string; // Unique ID for this log instance

  // --- Initial Craving Capture ---
  craving_timestamp: string; // ISO string for when the craving was first logged
  habit_type: string;
  trigger: string;
  location?: string;
  // time_of_day field removed
  craving_intensity: number; // Scale 1-10
  emotional_state_before: string[]; // Now directly an array
  impulse_description?: string;

  // --- Post-Action Follow-up ---
  follow_up_timestamp?: string;
  action_taken: ActionTakenType;
  action_details?: string;
  duration?: string;
  substitute_action?: string;
  emotional_state_after?: string[]; // Now directly an array
  reflection?: string;
  tagged_as?: string[]; // Now directly an array
}

export type EventLoopLogView =
  | "log_list"
  | "stats_craving_action"
  | "stats_emotion_delta"
  | "stats_trigger_frequency"
  | "stats_time_heatmap";

export interface EventLoopLoggerConfig {
  widgetTitle: string;
  log: EventLoopEntry[];

  habitTypes: string[];
  commonTriggers: string[];
  commonLocations: string[];
  // commonTimesOfDay removed
  commonEmotions: string[];
  commonTags: string[];
  commonSubstituteActions: string[];

  defaultFollowUpDelayMinutes: number;
  showPendingFollowUps: boolean;
  activeDisplayView: EventLoopLogView;
  entriesPerPage: number;
}
