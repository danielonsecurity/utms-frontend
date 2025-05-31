export interface HabitAction {
  id: string; // Unique identifier for the action (e.g., UUID)
  name: string; // e.g., "Make Bed"
  emoji?: string; // e.g., "🛏"
}

export interface HabitActionLogEntry {
  timestamp: string; // ISO string for when it was completed
  notes?: string; // Optional annotation
}

export interface DailyLog {
  // Key is HabitAction.id
  [actionId: string]: HabitActionLogEntry;
}

export interface HabitTrackerConfig {
  widgetTitle: string;
  actions: HabitAction[];
  // Key is date string in "YYYY-MM-DD" format
  log: {
    [dateKey: string]: DailyLog;
  };
  showHistory: boolean; // To toggle mini-history view
}
