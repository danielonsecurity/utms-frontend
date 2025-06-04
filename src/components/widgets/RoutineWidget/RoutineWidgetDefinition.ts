import { RoutineWidget, RoutineConfig } from "./RoutineWidget"; // and other defined types
import { WidgetDefinition } from "../../widgets/registry";
import { RoutineWidgetConfigEditor } from "./RoutineWidgetConfigEditor"; // To be created

const DEFAULT_ROUTINE_CONFIG: RoutineConfig = {
  name: "New Routine",
  symbol: "📋",
  startAnchor: { type: "none" },
  timeWindow: { start: "00:00", end: "23:59" },
  steps: [
    { id: "step1", name: "First Step", optional: false, estimatedTime: 5 },
    { id: "step2", name: "Second Step", optional: true, estimatedTime: 10 },
  ],
  completionCriteria: {
    type: "all_required",
  },
  soundEnabled: true,
  notificationEnabled: true,
};

export const routineWidgetDefinition: WidgetDefinition<
  RoutineConfig,
  Partial<RoutineConfig> // Or full, depending on system
> = {
  type: "routine",
  displayName: "Routine Tracker",
  component: RoutineWidget,
  defaultConfig: DEFAULT_ROUTINE_CONFIG,
  defaultLayout: { w: 4, h: 6 }, // Routines likely need more space
  configComponent: RoutineWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Routine ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    const config = {
      ...DEFAULT_ROUTINE_CONFIG,
      ...(loadedConfig || {}),
      // Ensure nested objects have defaults if partially loaded
      startAnchor: {
        ...DEFAULT_ROUTINE_CONFIG.startAnchor,
        ...(loadedConfig?.startAnchor || {}),
      },
      timeWindow: {
        ...DEFAULT_ROUTINE_CONFIG.timeWindow,
        ...(loadedConfig?.timeWindow || {}),
      },
      steps:
        loadedConfig?.steps && loadedConfig.steps.length > 0
          ? loadedConfig.steps
          : [...DEFAULT_ROUTINE_CONFIG.steps.map((s) => ({ ...s }))], // Deep copy
      completionCriteria: {
        ...DEFAULT_ROUTINE_CONFIG.completionCriteria,
        ...(loadedConfig?.completionCriteria || {}),
      },
    };

    if (!config.name || config.name === DEFAULT_ROUTINE_CONFIG.name) {
      config.name =
        loadedConfig?.name || currentDashboardTitle || defaultInstanceName;
    }
    // Add more specific sanitization for each field in RoutineConfig
    // e.g., ensure step IDs are unique if loaded config has duplicates
    // ensure mandatoryStepIds in completionCriteria actually exist in steps.

    return config;
  },
  icon: "📋", // Or a more relevant emoji
};
