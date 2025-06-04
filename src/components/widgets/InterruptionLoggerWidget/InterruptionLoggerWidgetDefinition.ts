import {
  InterruptionLoggerWidget,
  InterruptionLoggerConfig,
  InterruptionEntry,
  InterruptionType,
} from "./InterruptionLoggerWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { InterruptionLoggerWidgetConfigEditor } from "./InterruptionLoggerWidgetConfigEditor";

const DEFAULT_MAX_RECENT_CAUSES = 20;

const DEFAULT_INTERRUPTION_LOGGER_CONFIG: InterruptionLoggerConfig = {
  name: "Interruption Log",
  interruptions: [],
  recentCauses: [],
  maxRecentCauses: DEFAULT_MAX_RECENT_CAUSES,
};

export const interruptionLoggerWidgetDefinition: WidgetDefinition<
  InterruptionLoggerConfig,
  Partial<InterruptionLoggerConfig>
> = {
  type: "interruptionlogger",
  displayName: "Interruption Logger",
  icon: "⚠️", // Or "🛑" or "⚡"
  component: InterruptionLoggerWidget,
  defaultConfig: DEFAULT_INTERRUPTION_LOGGER_CONFIG,
  defaultLayout: { w: 5, h: 6 },
  configComponent: InterruptionLoggerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Interruptions ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    const config: InterruptionLoggerConfig = {
      ...DEFAULT_INTERRUPTION_LOGGER_CONFIG,
      ...(loadedConfig || {}),
    };

    if (
      !config.name ||
      config.name === DEFAULT_INTERRUPTION_LOGGER_CONFIG.name
    ) {
      config.name =
        loadedConfig?.name || currentDashboardTitle || defaultInstanceName;
    }

    if (!Array.isArray(config.interruptions)) {
      config.interruptions = [];
    }
    config.interruptions = config.interruptions
      .map((entry: any): InterruptionEntry => {
        const validTypes = Object.values(InterruptionType);
        let typesArray: InterruptionType[] = [];
        if (Array.isArray(entry.types)) {
          typesArray = entry.types.filter((t: any) =>
            validTypes.includes(t as InterruptionType),
          );
        } else if (
          entry.types &&
          validTypes.includes(entry.types as InterruptionType)
        ) {
          typesArray = [entry.types as InterruptionType]; // Handle old single type storage if any
        }

        return {
          id: String(
            entry.id ||
              `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ),
          description: String(
            entry.description || "Unknown interruption",
          ).trim(),
          startTime:
            typeof entry.startTime === "number" ? entry.startTime : Date.now(),
          endTime:
            typeof entry.endTime === "number"
              ? entry.endTime
              : entry.startTime || Date.now(),
          types:
            typesArray.length > 0 ? typesArray : [InterruptionType.DISTRACTION],
          impact:
            typeof entry.impact === "number" &&
            entry.impact >= 0 &&
            entry.impact <= 1
              ? entry.impact
              : 0.5,
          notes: typeof entry.notes === "string" ? entry.notes : undefined,
        };
      })
      .sort((a, b) => b.startTime - a.startTime); // Show newest first generally

    if (!Array.isArray(config.recentCauses)) {
      config.recentCauses = [];
    }
    config.recentCauses = [
      ...new Set(config.recentCauses.map((rc) => String(rc).trim())),
    ].slice(0, config.maxRecentCauses || DEFAULT_MAX_RECENT_CAUSES);

    if (
      typeof config.maxRecentCauses !== "number" ||
      config.maxRecentCauses <= 0
    ) {
      config.maxRecentCauses = DEFAULT_MAX_RECENT_CAUSES;
    }

    return config;
  },
};
