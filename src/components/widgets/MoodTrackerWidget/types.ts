export interface Mood {
  id: string; // Unique identifier for the mood type (e.g., UUID)
  name: string; // e.g., "Happy", "Sad"
  emoji?: string; // e.g., "😊"
}

export interface MoodLogEntry {
  id: string; // Unique ID for this specific log instance
  moodId: string; // Corresponds to Mood.id
  timestamp: string; // ISO string for when the mood was logged
  notes?: string; // Optional annotation
}

export interface MoodTrackerConfig {
  widgetTitle: string;
  moods: Mood[]; // List of predefined moods the user can select
  // Key is date string in "YYYY-MM-DD" format
  log: {
    [dateKey: string]: MoodLogEntry[]; // A day can have multiple mood entries
  };
  showHistory: boolean; // To toggle mini-history view
}
