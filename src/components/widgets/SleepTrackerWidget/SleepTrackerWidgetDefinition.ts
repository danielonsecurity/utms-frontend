import { WidgetDefinition } from "../../../widgets/registry";
import { SleepTrackerWidget } from "./SleepTrackerWidget";
import { SleepTrackerWidgetConfigEditor } from "./SleepTrackerWidgetConfigEditor";
import { SleepTrackerConfig, SleepLogEntry } from "./types"; // Ensure SleepLogEntry is imported if used in sanitize

const DEFAULT_SLEEP_TRACKER_CONFIG: SleepTrackerConfig = {
  widgetTitle: "Sleep Log",
  logs: [], // Initialize with empty logs
  displayDaysInTimeline: 7,
  activeSleepStartTime: undefined,
  activeSleepStartDate: undefined,
};

export const sleepTrackerWidgetDefinition: WidgetDefinition<
  SleepTrackerConfig,
  Partial<SleepTrackerConfig>
> = {
  type: "sleep-tracker",
  displayName: "Sleep Tracker",
  component: SleepTrackerWidget,
  defaultConfig: DEFAULT_SLEEP_TRACKER_CONFIG,
  defaultLayout: { w: 4, h: 10 }, // Needs to be tall for form + timeline
  configComponent: SleepTrackerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = { ...DEFAULT_SLEEP_TRACKER_CONFIG }; // fresh copy of defaults
    const config = { ...defaults, ...(loadedConfig || {}) };

    config.widgetTitle =
      loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle;

    if (Array.isArray(loadedConfig?.logs)) {
      config.logs = loadedConfig.logs
        .map((log: any) => ({
          // Be defensive with 'any' from loaded data
          date:
            typeof log.date === "string"
              ? log.date
              : new Date().toISOString().split("T")[0],
          sleepStart:
            typeof log.sleepStart === "string" ? log.sleepStart : "00:00",
          sleepEnd: typeof log.sleepEnd === "string" ? log.sleepEnd : "08:00",
          quality:
            typeof log.quality === "number"
              ? Math.min(5, Math.max(1, log.quality))
              : 3,
          notes: typeof log.notes === "string" ? log.notes.trim() : undefined,
        }))
        .filter((log) => log.date && log.sleepStart && log.sleepEnd); // Basic validation
    } else {
      config.logs = defaults.logs;
    }
    // Ensure logs are sorted by date descending
    config.logs.sort((a, b) => b.date.localeCompare(a.date));

    config.displayDaysInTimeline =
      typeof loadedConfig?.displayDaysInTimeline === "number" &&
      loadedConfig.displayDaysInTimeline >= 3
        ? loadedConfig.displayDaysInTimeline
        : defaults.displayDaysInTimeline;

    config.activeSleepStartTime =
      typeof loadedConfig?.activeSleepStartTime === "string"
        ? loadedConfig.activeSleepStartTime
        : undefined;
    config.activeSleepStartDate =
      typeof loadedConfig?.activeSleepStartDate === "string"
        ? loadedConfig.activeSleepStartDate
        : undefined;
    // If one exists without the other, clear them for consistency
    if (
      (config.activeSleepStartTime && !config.activeSleepStartDate) ||
      (!config.activeSleepStartTime && config.activeSleepStartDate)
    ) {
      config.activeSleepStartTime = undefined;
      config.activeSleepStartDate = undefined;
    }

    return config;
  },
  icon: "😴",
};
