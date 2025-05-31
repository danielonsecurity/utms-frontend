import { WidgetDefinition } from "../../../widgets/registry";
import { HabitTrackerWidget } from "./HabitTrackerWidget";
import { HabitTrackerWidgetConfigEditor } from "./HabitTrackerWidgetConfigEditor";
import { HabitTrackerConfig, HabitAction } from "./types";

const DEFAULT_HABIT_ACTIONS: HabitAction[] = [
  { id: crypto.randomUUID(), name: "Make Bed", emoji: "🛏️" },
  { id: crypto.randomUUID(), name: "Brush Teeth AM", emoji: "🪥" },
  { id: crypto.randomUUID(), name: "Brush Teeth PM", emoji: "🦷" },
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
        .map((act) => ({
          id: act.id || crypto.randomUUID(),
          name: typeof act.name === "string" ? act.name : "Unnamed Habit",
          emoji: typeof act.emoji === "string" ? act.emoji : undefined,
        }))
        .filter((act) => act.name); // Filter out actions that somehow lost their name
      if (config.actions.length === 0 && defaults.actions.length > 0) {
        // If user somehow cleared all actions, give them defaults back instead of an empty state.
        // Or, respect empty actions array if that's intentional. For now, let's allow empty.
      }
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
