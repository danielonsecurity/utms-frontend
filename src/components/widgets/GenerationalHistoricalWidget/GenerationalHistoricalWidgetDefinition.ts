import {
  GenerationalHistoricalWidget,
  GenerationalHistoricalWidgetConfig,
} from "./GenerationalHistoricalWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { GenerationalHistoricalWidgetConfigEditor } from "./GenerationalHistoricalWidgetConfigEditor";
import { GenerationalHistoricalWidgetConfig } from "./types"; // Import from types.ts

const DEFAULT_GENERATIONAL_HISTORICAL_CONFIG: GenerationalHistoricalWidgetConfig =
  {
    name: "Generational Timeline",
    showHistoricalPeriods: true,
  };

export const generationalHistoricalWidgetDefinition: WidgetDefinition<
  GenerationalHistoricalWidgetConfig,
  Partial<GenerationalHistoricalWidgetConfig>
> = {
  type: "generational-historical",
  displayName: "Generational Timeline",
  icon: "📜",
  component: GenerationalHistoricalWidget,
  defaultConfig: DEFAULT_GENERATIONAL_HISTORICAL_CONFIG,
  defaultLayout: { w: 12, h: 8, minW: 6, minH: 5 }, // Larger default size
  configComponent: GenerationalHistoricalWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Timeline ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    const config = {
      ...DEFAULT_GENERATIONAL_HISTORICAL_CONFIG,
      ...(loadedConfig || {}),
    };
    config.name = config.name || currentDashboardTitle || defaultInstanceName;
    config.showHistoricalPeriods =
      typeof config.showHistoricalPeriods === "boolean"
        ? config.showHistoricalPeriods
        : DEFAULT_GENERATIONAL_HISTORICAL_CONFIG.showHistoricalPeriods;
    return config;
  },
};
