import {
  TimelineWidget,
  TimelineConfig,
  TimelineWidgetSpecificProps,
} from "./TimelineWidget";
import { WidgetDefinition, WidgetProps } from "../../../widgets/registry";
import { getMasterSampleTasks } from "../../../data/sampleTasks";

const parseDateConfig = (
  dateInput: string | Date,
  defaultValue: Date,
): Date => {
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput;
  }
  if (typeof dateInput === "string") {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  return defaultValue;
};

const getDefaultTimelineConfig = (idNum?: number): TimelineConfig => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    name: `Timeline ${idNum !== undefined ? idNum : "Default"}`,
    timeRange: {
      start: new Date(today.getTime() + 6 * 60 * 60 * 1000),
      end: new Date(today.getTime() + 23 * 60 * 60 * 1000),
    },
    showNowBar: true,
    groupByTags: false,
    showInterruptions: true,
  };
};

export const timelineWidgetDefinition: WidgetDefinition<
  TimelineConfig,
  Partial<TimelineConfig>
> = {
  type: "timeline",
  displayName: "Timeline",
  component: TimelineWidget as React.ComponentType<WidgetProps<TimelineConfig>>,
  defaultConfig: getDefaultTimelineConfig(),
  defaultLayout: { w: 8, h: 6 },
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const idNum = idNumPart ? parseInt(idNumPart, 10) : undefined;
    const defaultConfig = getDefaultTimelineConfig(idNum);

    const mergedConfig = {
      ...defaultConfig,
      ...(loadedConfig || {}),
    };

    if (
      !mergedConfig.name ||
      mergedConfig.name === defaultConfig.name ||
      mergedConfig.name.startsWith("Timeline Default")
    ) {
      mergedConfig.name =
        loadedConfig?.name ||
        currentDashboardTitle ||
        `Timeline ${idNum !== undefined ? idNum : widgetId.substring(widgetId.length - 3)}`;
    }

    const defaultTR = defaultConfig.timeRange;
    mergedConfig.timeRange = {
      start: parseDateConfig(mergedConfig.timeRange?.start, defaultTR.start),
      end: parseDateConfig(mergedConfig.timeRange?.end, defaultTR.end),
    };

    if (
      mergedConfig.timeRange.start.getTime() >=
      mergedConfig.timeRange.end.getTime()
    ) {
      console.warn(
        `Timeline widget ${widgetId}: Invalid timeRange (start >= end). Resetting to default.`,
      );
      mergedConfig.timeRange = defaultTR;
    }

    return mergedConfig as TimelineConfig;
  },
  icon: "📊",

  getSpecificProps: () => ({
    tasks: getMasterSampleTasks(),
  }),
};
