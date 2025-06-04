import { WidgetDefinition } from "../../../widgets/registry"; // Adjust path
import { MoodTrackerWidget } from "./MoodTrackerWidget";
import { MoodTrackerWidgetConfigEditor } from "./MoodTrackerWidgetConfigEditor";
import { MoodTrackerConfig, Mood, MoodLogEntry } from "./types";

const DEFAULT_MOODS: Mood[] = [
  { id: crypto.randomUUID(), name: "Happy", emoji: "😊" },
  { id: crypto.randomUUID(), name: "Okay", emoji: "😐" },
  { id: crypto.randomUUID(), name: "Sad", emoji: "😢" },
  { id: crypto.randomUUID(), name: "Anxious", emoji: "😟" },
  { id: crypto.randomUUID(), name: "Excited", emoji: "🎉" },
];

const DEFAULT_MOOD_TRACKER_CONFIG: MoodTrackerConfig = {
  widgetTitle: "My Moods",
  moods: DEFAULT_MOODS,
  log: {},
  showHistory: true,
};

export const moodTrackerWidgetDefinition: WidgetDefinition<
  MoodTrackerConfig,
  Partial<MoodTrackerConfig>
> = {
  type: "mood-tracker",
  displayName: "Mood Tracker",
  component: MoodTrackerWidget,
  defaultConfig: DEFAULT_MOOD_TRACKER_CONFIG,
  defaultLayout: { w: 4, h: 6 }, // Adjust as needed
  configComponent: MoodTrackerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = DEFAULT_MOOD_TRACKER_CONFIG;
    const config = { ...defaults, ...(loadedConfig || {}) };

    config.widgetTitle =
      loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle;

    if (!Array.isArray(config.moods)) {
      config.moods = defaults.moods;
    } else {
      config.moods = config.moods
        .map((m) => ({
          id: m.id || crypto.randomUUID(),
          name: typeof m.name === "string" ? m.name : "Unnamed Mood",
          emoji: typeof m.emoji === "string" ? m.emoji : undefined,
        }))
        .filter((m) => m.name && m.name !== "Unnamed Mood");
      if (config.moods.length === 0 && defaults.moods.length > 0) {
        // If user cleared all moods, give them defaults back
        config.moods = defaults.moods;
      }
    }

    config.log =
      typeof config.log === "object" && config.log !== null
        ? config.log
        : defaults.log;

    // Sanitize log entries
    Object.keys(config.log).forEach((dateKey) => {
      const dayLog = config.log[dateKey];
      if (Array.isArray(dayLog)) {
        config.log[dateKey] = dayLog.filter(
          (entry) =>
            entry &&
            typeof entry.id === "string" &&
            typeof entry.moodId === "string" &&
            typeof entry.timestamp === "string" &&
            !isNaN(new Date(entry.timestamp).getTime()),
        );
      } else {
        // If it's not an array for some reason, clear it for that day
        delete config.log[dateKey];
      }
    });

    config.showHistory =
      typeof config.showHistory === "boolean"
        ? config.showHistory
        : defaults.showHistory;

    return config;
  },
  icon: "😊",
};
