import { WidgetDefinition } from "../../../widgets/registry";
import { HabitTrackerWidget } from "./HabitTrackerWidget";
import { HabitTrackerWidgetConfigEditor } from "./HabitTrackerWidgetConfigEditor";
import { HabitTrackerConfig, HabitAction } from "./types";

if (!crypto.randomUUID) {
  crypto.randomUUID = () =>
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    );
}

const DEFAULT_HABIT_ACTIONS: HabitAction[] = [
  { id: crypto.randomUUID(), name: "Make Bed", emoji: "🛏️", maxSkipDays: 0 },
  {
    id: crypto.randomUUID(),
    name: "Brush Teeth AM",
    emoji: "🪥",
    maxSkipDays: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Brush Teeth PM",
    emoji: "🦷",
    maxSkipDays: 0,
  },
  { id: crypto.randomUUID(), name: "Exercise", emoji: "🏃", maxSkipDays: 1 }, // Example: due every other day
  {
    id: crypto.randomUUID(),
    name: "No Junk Food",
    emoji: "🚫🍟",
    maxSkipDays: 1,
  },
];

const DEFAULT_HABIT_TRACKER_CONFIG: HabitTrackerConfig = {
  widgetTitle: "Daily Habits",
  actions: DEFAULT_HABIT_ACTIONS,
  log: {},
  showHistory: true,
};

export const habitTrackerWidgetDefinition: WidgetDefinition<
  HabitTrackerConfig,
  Partial<HabitTrackerConfig> // For loaded config which might be incomplete
> = {
  type: "habit-tracker",
  displayName: "Habit Tracker",
  component: HabitTrackerWidget,
  defaultConfig: DEFAULT_HABIT_TRACKER_CONFIG,
  defaultLayout: { w: 4, h: 7 }, // Slightly taller for history and actions
  configComponent: HabitTrackerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = DEFAULT_HABIT_TRACKER_CONFIG;
    const config = { ...defaults, ...(loadedConfig || {}) };

    config.widgetTitle =
      loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle;

    // Ensure actions is an array and each action has an id, name.
    if (!Array.isArray(config.actions)) {
      config.actions = defaults.actions;
    } else {
      config.actions = config.actions
        .map((act: any) => ({
          id: act.id || crypto.randomUUID(),
          name:
            typeof act.name === "string" && act.name.trim()
              ? act.name.trim()
              : "Unnamed Habit",
          emoji: typeof act.emoji === "string" ? act.emoji : undefined,
          isNegative:
            typeof act.isNegative === "boolean" ? act.isNegative : false, // Sanitize isNegative
          maxSkipDays:
            !act.isNegative &&
            typeof act.maxSkipDays === "number" &&
            act.maxSkipDays >= 0
              ? act.maxSkipDays
              : act.isNegative
                ? undefined
                : 0, // Clear or default maxSkipDays
        }))
        .filter((act) => act.name && act.name !== "Unnamed Habit");
    }

    config.log =
      typeof config.log === "object" && config.log !== null
        ? config.log
        : defaults.log;
    // Further validation for log entries can be added if necessary (e.g., valid timestamps)

    config.showHistory =
      typeof config.showHistory === "boolean"
        ? config.showHistory
        : defaults.showHistory;

    return config;
  },
  icon: "🎯", // or "🗓️" or other suitable emoji
};
