export interface SleepLogEntry {
  date: string; // YYYY-MM-DD, primary key for the log
  sleepStart: string; // HH:MM (24-hour format)
  sleepEnd: string; // HH:MM (24-hour format)
  quality: number; // 1-5 (1=awful, 5=great)
  notes?: string;
  // Calculated in UI, not stored directly unless for caching optimization
  // durationMinutes?: number;
}

export interface SleepTrackerConfig {
  widgetTitle: string;
  logs: SleepLogEntry[];
  displayDaysInTimeline: number;
  activeSleepStartTime?: string;
  activeSleepStartDate?: string;
}
