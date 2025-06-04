// EventLoopLoggerWidgetDefinition.tsx (Key Changes)
import { WidgetDefinition } from "../../../widgets/registry"; // Adjust path
import { EventLoopLoggerWidget } from "./EventLoopLoggerWidget";
import { EventLoopLoggerWidgetConfigEditor } from "./EventLoopLoggerWidgetConfigEditor";
import { EventLoopLoggerConfig, EventLoopEntry } from "./types"; // ActionTakenType, EventLoopLogView not directly used here

const DEFAULT_EVENT_LOOP_LOGGER_CONFIG: EventLoopLoggerConfig = {
  widgetTitle: "My Event Loops",
  log: [],
  habitTypes: [
    "Compulsive Media",
    "Snacking",
    "Procrastination",
    "Negative Self-Talk",
    "Impulse Shopping",
  ],
  commonTriggers: [
    "Boredom",
    "Stress",
    "Tiredness",
    "Social Media Notification",
    "Email",
    "Feeling Overwhelmed",
  ],
  commonLocations: ["Home (Desk)", "Home (Couch)", "Work", "Commute"],
  // commonTimesOfDay REMOVED
  commonEmotions: [
    "Tired",
    "Unfocused",
    "Anxious",
    "Bored",
    "Stressed",
    "Happy",
    "Sad",
    "Frustrated",
    "Content",
    "Hopeful",
    "Guilty",
    "Numb",
  ],
  commonTags: [
    "Avoidance",
    "Productivity-Loss",
    "Mindless",
    "Stress-Response",
    "Short-Term Relief",
  ],
  commonSubstituteActions: [
    "Deep Breaths (1 min)",
    "Walk (5 mins)",
    "Drink Water",
    "Quick Stretch",
    "Read a Page",
    "Listen to Music",
    "Tidy Up One Thing",
  ],
  defaultFollowUpDelayMinutes: 20,
  showPendingFollowUps: true,
  activeDisplayView: "log_list",
  entriesPerPage: 10,
};

export const eventLoopLoggerWidgetDefinition: WidgetDefinition<
  EventLoopLoggerConfig,
  Partial<EventLoopLoggerConfig>
> = {
  type: "event-loop-logger",
  displayName: "Event Loop Logger",
  icon: "🔁",
  component: EventLoopLoggerWidget,
  defaultConfig: DEFAULT_EVENT_LOOP_LOGGER_CONFIG,
  defaultLayout: { w: 6, h: 8 },
  configComponent: EventLoopLoggerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = DEFAULT_EVENT_LOOP_LOGGER_CONFIG;
    // Ensure loadedConfig is an object
    const safeLoadedConfig =
      typeof loadedConfig === "object" && loadedConfig !== null
        ? loadedConfig
        : {};
    const config = { ...defaults, ...safeLoadedConfig };

    config.widgetTitle =
      safeLoadedConfig?.widgetTitle ||
      currentWidgetTitle ||
      defaults.widgetTitle;

    const stringArrayKeys: (keyof Omit<
      EventLoopLoggerConfig,
      | "log"
      | "widgetTitle"
      | "defaultFollowUpDelayMinutes"
      | "showPendingFollowUps"
      | "activeDisplayView"
      | "entriesPerPage"
    >)[] = [
      "habitTypes",
      "commonTriggers",
      "commonLocations" /* "commonTimesOfDay" REMOVED */,
      "commonEmotions",
      "commonTags",
      "commonSubstituteActions",
    ];
    stringArrayKeys.forEach((key) => {
      const loadedList = (safeLoadedConfig as any)[key];
      if (
        !Array.isArray(loadedList) ||
        !loadedList.every((item) => typeof item === "string")
      ) {
        (config as any)[key] = defaults[key];
      } else {
        (config as any)[key] = loadedList
          .map((s) => String(s || "").trim())
          .filter((s) => s);
        if (
          (config as any)[key].length === 0 &&
          (key === "habitTypes" ||
            key === "commonTriggers" ||
            key === "commonEmotions")
        ) {
          (config as any)[key] = defaults[key];
        }
      }
    });

    config.defaultFollowUpDelayMinutes =
      typeof safeLoadedConfig?.defaultFollowUpDelayMinutes === "number" &&
      safeLoadedConfig.defaultFollowUpDelayMinutes > 0
        ? safeLoadedConfig.defaultFollowUpDelayMinutes
        : defaults.defaultFollowUpDelayMinutes;

    config.showPendingFollowUps =
      typeof safeLoadedConfig?.showPendingFollowUps === "boolean"
        ? safeLoadedConfig.showPendingFollowUps
        : defaults.showPendingFollowUps;

    config.activeDisplayView =
      safeLoadedConfig?.activeDisplayView &&
      [
        "log_list",
        "stats_craving_action",
        "stats_emotion_delta",
        "stats_trigger_frequency",
        "stats_time_heatmap",
      ].includes(safeLoadedConfig.activeDisplayView)
        ? safeLoadedConfig.activeDisplayView
        : defaults.activeDisplayView;

    config.entriesPerPage =
      typeof safeLoadedConfig?.entriesPerPage === "number" &&
      safeLoadedConfig.entriesPerPage > 0 &&
      safeLoadedConfig.entriesPerPage <= 100
        ? safeLoadedConfig.entriesPerPage
        : defaults.entriesPerPage;

    if (!Array.isArray(config.log)) {
      config.log = defaults.log;
    } else {
      config.log = config.log
        .filter((entry): entry is EventLoopEntry => {
          if (!entry || typeof entry.id !== "string") return false;
          if (
            typeof entry.craving_timestamp !== "string" ||
            isNaN(new Date(entry.craving_timestamp).getTime())
          )
            return false;
          if (typeof entry.habit_type !== "string" || !entry.habit_type.trim())
            return false;
          if (typeof entry.trigger !== "string" || !entry.trigger.trim())
            return false;
          if (
            typeof entry.craving_intensity !== "number" ||
            entry.craving_intensity < 1 ||
            entry.craving_intensity > 10
          )
            return false;

          // Array fields
          const arrayFields: (keyof EventLoopEntry)[] = [
            "emotional_state_before",
            "emotional_state_after",
            "tagged_as",
          ];
          for (const field of arrayFields) {
            const val = entry[field];
            if (val !== undefined) {
              // only validate if present
              if (
                !Array.isArray(val) ||
                !val.every((s) => typeof s === "string")
              )
                return false;
            }
          }
          // Ensure emotional_state_before is always an array, even if empty
          if (!Array.isArray(entry.emotional_state_before))
            entry.emotional_state_before = [];

          if (
            !entry.action_taken ||
            !["succumbed", "resisted", "redirected", "unknown"].includes(
              entry.action_taken,
            )
          )
            return false;

          // Optional string fields validation
          const optionalStringFields: (keyof EventLoopEntry)[] = [
            "location",
            "impulse_description",
            "action_details",
            "duration",
            "substitute_action",
            "reflection",
          ];
          for (const field of optionalStringFields) {
            if (entry[field] !== undefined && typeof entry[field] !== "string")
              return false;
          }

          if (
            entry.follow_up_timestamp !== undefined &&
            (typeof entry.follow_up_timestamp !== "string" ||
              isNaN(new Date(entry.follow_up_timestamp).getTime()))
          )
            return false;

          return true;
        })
        .map((entry) => ({
          // Ensure default arrays for optional array fields if they are expected
          ...entry,
          emotional_state_before: entry.emotional_state_before || [],
          emotional_state_after: entry.emotional_state_after || [],
          tagged_as: entry.tagged_as || [],
        }));
    }
    return config;
  },
};
