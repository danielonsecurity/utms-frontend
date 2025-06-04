export interface HabitAction {
  id: string; // Unique identifier for the action (e.g., UUID)
  name: string; // e.g., "Make Bed"
  emoji?: string; // e.g., "🛏"
  maxSkipDays?: number; // 0 = daily, 1 = can skip 1 day (due every other day), 6 = can skip 6 days (due weekly)
  isNegative?: boolean; // true if this is a habit to AVOID. Defaults to false.
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
