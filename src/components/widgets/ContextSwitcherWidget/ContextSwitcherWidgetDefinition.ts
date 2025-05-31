import {
  ContextSwitcherWidget,
  ContextSwitcherConfig,
  ContextEntry,
} from "./ContextSwitcherWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { ContextSwitcherWidgetConfigEditor } from "./ContextSwitcherWidgetConfigEditor";

const DEFAULT_COLOR_PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7B7A3",
  "#A2D5F2",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#7F7EFF",
  "#FCCA46",
  "#23CE6B",
  "#E71D36",
  "#FF9F1C",
];

const DEFAULT_CONTEXT_SWITCHER_CONFIG: ContextSwitcherConfig = {
  name: "Context Tracker",
  contexts: [],
  contextColors: {},
  colorPalette: DEFAULT_COLOR_PALETTE,
  nextColorIndex: 0, // To cycle through palette
};

export const contextSwitcherWidgetDefinition: WidgetDefinition<
  ContextSwitcherConfig,
  Partial<ContextSwitcherConfig>
> = {
  type: "contextswitcher",
  displayName: "Context Switcher",
  component: ContextSwitcherWidget,
  defaultConfig: DEFAULT_CONTEXT_SWITCHER_CONFIG,
  defaultLayout: { w: 6, h: 4 }, // Adjust as needed
  configComponent: ContextSwitcherWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Context Tracker ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    const config = {
      ...DEFAULT_CONTEXT_SWITCHER_CONFIG,
      ...(loadedConfig || {}),
    };

    if (!config.name || config.name === DEFAULT_CONTEXT_SWITCHER_CONFIG.name) {
      config.name =
        loadedConfig?.name || currentDashboardTitle || defaultInstanceName;
    }

    // Ensure arrays and objects exist and have correct types
    if (!Array.isArray(config.contexts)) {
      config.contexts = [];
    }
    config.contexts = config.contexts
      .map(
        (entry: any): ContextEntry => ({
          id:
            entry.id ||
            `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: String(entry.name || "Unknown Context"),
          startTime:
            typeof entry.startTime === "number" ? entry.startTime : Date.now(),
          endTime: typeof entry.endTime === "number" ? entry.endTime : null, // can be null
          color: String(entry.color || "#cccccc"),
        }),
      )
      .sort((a, b) => a.startTime - b.startTime); // Sort by start time

    if (
      typeof config.contextColors !== "object" ||
      config.contextColors === null ||
      Array.isArray(config.contextColors)
    ) {
      config.contextColors = {};
    }
    if (
      !Array.isArray(config.colorPalette) ||
      config.colorPalette.length === 0
    ) {
      config.colorPalette = DEFAULT_COLOR_PALETTE;
    }
    if (
      typeof config.nextColorIndex !== "number" ||
      config.nextColorIndex < 0
    ) {
      config.nextColorIndex = 0;
    }

    return config;
  },
  icon: "⏱️", // Example icon
};
