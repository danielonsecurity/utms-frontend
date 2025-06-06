import { WidgetDefinition } from "../../widgets/registry"; // Adjust path as needed
import { ModularTaskTrackerWidget } from "./ModularTaskTrackerWidget";
import { ModularTaskTrackerConfigEditor } from "./ModularTaskTrackerWidgetConfigEditor";
import { ModularTaskTrackerConfig, ModuleDefinition } from "./types"; // Using types.ts

const DEFAULT_MODULAR_TASK_TRACKER_CONFIG: ModularTaskTrackerConfig = {
  widgetTitle: "My Tasks",
  modules: [], // Start with no predefined modules
  defaultStrategy: "decay", // 'decay' will be implicitly handled by sorting in display
  defaultView: "list",
  sessionEffortThreshold: 10,
  allowSnooze: true,
  snoozeDurationDays: 3,
};

// Helper to ensure module IDs are unique if somehow duplicated (e.g. copy-paste of config)
// and ensures basic type safety for critical fields.
const sanitizeModules = (modules: any[] | undefined): ModuleDefinition[] => {
  if (!Array.isArray(modules)) {
    return [];
  }
  const seenIds = new Set<string>();
  return modules.map((mod: any, index: number): ModuleDefinition => {
    let id =
      typeof mod.id === "string" && mod.id
        ? mod.id
        : `mod_load_${Date.now()}_${index}`;
    while (seenIds.has(id)) {
      id = `${id}_dup`;
    }
    seenIds.add(id);

    return {
      id: id,
      name:
        typeof mod.name === "string" ? mod.name : `Unnamed Task ${index + 1}`,
      location: typeof mod.location === "string" ? mod.location : "General",
      effort: typeof mod.effort === "number" && mod.effort > 0 ? mod.effort : 1,
      frequencyDays:
        typeof mod.frequencyDays === "number" && mod.frequencyDays > 0
          ? mod.frequencyDays
          : 7,
      notes: typeof mod.notes === "string" ? mod.notes : "",
    };
  });
};

export const modularTaskTrackerWidgetDefinition: WidgetDefinition<
  ModularTaskTrackerConfig,
  Partial<ModularTaskTrackerConfig> // For partial updates during load/config
> = {
  type: "modular-task-tracker",
  displayName: "Modular Task Tracker",
  component: ModularTaskTrackerWidget,
  defaultConfig: DEFAULT_MODULAR_TASK_TRACKER_CONFIG,
  defaultLayout: { w: 4, h: 6, minW: 3, minH: 4 }, // Slightly larger default, with min dimensions
  configComponent: ModularTaskTrackerConfigEditor,
  icon: "🧩", // Example Icon (Emoji)
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Tasks ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    // Start with the system default, then merge loaded config
    const config = {
      ...DEFAULT_MODULAR_TASK_TRACKER_CONFIG,
      ...(loadedConfig || {}),
    };

    // Ensure specific fields have correct types or fall back to defaults
    config.widgetTitle =
      typeof config.widgetTitle === "string" && config.widgetTitle.trim() !== ""
        ? config.widgetTitle
        : loadedConfig?.widgetTitle ||
          currentDashboardTitle ||
          defaultInstanceName;

    config.modules = sanitizeModules(config.modules);

    config.defaultStrategy =
      config.defaultStrategy === "decay" ||
      config.defaultStrategy === "effort_first" ||
      config.defaultStrategy === "manual"
        ? config.defaultStrategy
        : DEFAULT_MODULAR_TASK_TRACKER_CONFIG.defaultStrategy;

    config.defaultView =
      config.defaultView === "list" || config.defaultView === "by_location"
        ? config.defaultView
        : DEFAULT_MODULAR_TASK_TRACKER_CONFIG.defaultView;

    config.sessionEffortThreshold =
      typeof config.sessionEffortThreshold === "number" &&
      config.sessionEffortThreshold > 0
        ? config.sessionEffortThreshold
        : DEFAULT_MODULAR_TASK_TRACKER_CONFIG.sessionEffortThreshold;

    config.allowSnooze =
      typeof config.allowSnooze === "boolean"
        ? config.allowSnooze
        : DEFAULT_MODULAR_TASK_TRACKER_CONFIG.allowSnooze;

    config.snoozeDurationDays =
      typeof config.snoozeDurationDays === "number" &&
      config.snoozeDurationDays > 0
        ? config.snoozeDurationDays
        : DEFAULT_MODULAR_TASK_TRACKER_CONFIG.snoozeDurationDays;

    return config;
  },
};
