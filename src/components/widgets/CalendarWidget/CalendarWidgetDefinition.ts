// src/components/widgets/CalendarWidget/CalendarWidgetDefinition.ts
import { WidgetDefinition } from "../../../widgets/registry";
import { CalendarWidget } from "./CalendarWidget";
import { CalendarWidgetConfigEditor } from "./CalendarWidgetConfigEditor";
import { CalendarWidgetConfig } from "../../../types/calendar";

const DEFAULT_CALENDAR_CONFIG: CalendarWidgetConfig = {
  widgetTitle: "My Calendar",
  sources: [], // Default to showing nothing
};

export const calendarWidgetDefinition: WidgetDefinition<CalendarWidgetConfig> =
  {
    type: "calendar",
    displayName: "Calendar",
    description: "Displays recurring and scheduled entities on a calendar.",
    component: CalendarWidget,
    configComponent: CalendarWidgetConfigEditor,
    defaultConfig: DEFAULT_CALENDAR_CONFIG,
    defaultLayout: { w: 8, h: 8 }, // Calendar needs more space
    icon: "📅",
    sanitizeConfig: (loadedConfig) => {
      // Basic sanitization
      return {
        widgetTitle:
          loadedConfig?.widgetTitle || DEFAULT_CALENDAR_CONFIG.widgetTitle,
        sources: Array.isArray(loadedConfig?.sources)
          ? loadedConfig.sources
          : [],
      };
    },
  };
