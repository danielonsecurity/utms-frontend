// entropyBurdenTracker/types.ts

export type EnergyLevel = "Low" | "Medium" | "High" | "Very High";
export type EmotionalLoadEmoji = "😊" | "🙂" | "😐" | "😟" | "😩" | "🤯"; // Example emojis
export type ImportanceLevel = "Low" | "Medium" | "High" | "Critical";
export type DecayRate = "Slow" | "Steady" | "Accelerating";

export interface BurdenActionLogEntry {
  id: string; // Unique ID for this log instance
  timestamp: string; // ISO string for when the interaction was logged
  notes?: string; // User's description of what they did
  energyExpended?: EnergyLevel;
  entropyChange: number; // Subjective change, e.g., -0.2 for reduction, +0.1 for increase if neglected further
  moodAfter?: EmotionalLoadEmoji; // Or a string like "Relieved", "Frustrated"
}

export interface EntropyBurden {
  id: string; // Unique identifier for the burden
  name: string; // e.g., "Clean Attic", "Inbox Zero"
  description?: string; // Optional more detailed description

  // Core subjective metrics
  currentEntropyLevel: number; // 0.0 (resolved) to 1.0 (max entropy/overwhelm)
  lastTouchedTimestamp?: string; // ISO string of the last interaction

  // Optional qualitative metadata
  energyToEngage?: EnergyLevel; // Typical energy needed to start working on it
  emotionalLoad?: EmotionalLoadEmoji; // General feeling about this task
  importance?: ImportanceLevel;
  decayRate?: DecayRate; // How quickly it gets worse if ignored
  tags?: string[]; // e.g., ["home", "digital", "health"]

  // History of interactions
  log: BurdenActionLogEntry[];
  creationTimestamp: string; // When this burden was first defined
}

export interface EntropyBurdenTrackerConfig {
  widgetTitle: string;
  burdens: EntropyBurden[];
  // Future: Sort order, filter settings, AI suggestion preferences
}
