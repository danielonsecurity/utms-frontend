// metricGoalTracker/MetricGoalTrackerWidgetDefinition.ts
import { WidgetDefinition } from "../../../widgets/registry";
import { MetricGoalTrackerWidget } from "./MetricGoalTrackerWidget";
import { MetricGoalTrackerWidgetConfigEditor } from "./MetricGoalTrackerWidgetConfigEditor";
import {
  MetricGoalTrackerConfig,
  MetricGoal,
  MetricAdjustmentLogEntry,
  MetricZone,
  MetricLogTemplate,
  ChartConfig, // Added
  ChartRenderType, // Added
  TimePeriod, // Added
} from "./types";

// DEFAULT_ZONE_COLORS and createDefaultMetricZonesForGoal remain the same
const DEFAULT_ZONE_COLORS = {
  /* ... no changes ... */ ideal: "rgba(76, 175, 80, 0.7)",
  good: "rgba(173, 216, 230, 0.7)",
  warning_low: "rgba(255, 193, 7, 0.7)",
  warning_high: "rgba(255, 193, 7, 0.7)",
  critical_low: "rgba(244, 67, 54, 0.7)",
  critical_high: "rgba(244, 67, 54, 0.7)",
};
const createDefaultMetricZonesForGoal = (unit?: string): MetricZone[] => {
  /* ... no changes ... */
  if (unit === "emails" || unit === "items" || unit === "count") {
    return [
      {
        id: crypto.randomUUID(),
        label: "Ideal",
        lowerBound: 0,
        upperBound: 10,
        color: DEFAULT_ZONE_COLORS.ideal,
      },
      {
        id: crypto.randomUUID(),
        label: "Acceptable",
        lowerBound: 11,
        upperBound: 50,
        color: DEFAULT_ZONE_COLORS.good,
      },
      {
        id: crypto.randomUUID(),
        label: "High",
        lowerBound: 51,
        upperBound: 100,
        color: DEFAULT_ZONE_COLORS.warning_high,
      },
      {
        id: crypto.randomUUID(),
        label: "Critical High",
        lowerBound: 101,
        color: DEFAULT_ZONE_COLORS.critical_high,
      },
    ];
  } else if (unit === "kg" || unit === "lbs" || unit === "weight") {
    return [
      {
        id: crypto.randomUUID(),
        label: "Underweight",
        upperBound: unit === "kg" ? 55 : 120,
        color: DEFAULT_ZONE_COLORS.critical_low,
      },
      {
        id: crypto.randomUUID(),
        label: "Healthy Range",
        lowerBound: unit === "kg" ? 55 : 120,
        upperBound: unit === "kg" ? 75 : 165,
        color: DEFAULT_ZONE_COLORS.ideal,
      },
      {
        id: crypto.randomUUID(),
        label: "Overweight",
        lowerBound: unit === "kg" ? 75 : 165,
        upperBound: unit === "kg" ? 90 : 200,
        color: DEFAULT_ZONE_COLORS.warning_high,
      },
      {
        id: crypto.randomUUID(),
        label: "Obese",
        lowerBound: unit === "kg" ? 90 : 200,
        color: DEFAULT_ZONE_COLORS.critical_high,
      },
    ];
  } else if (unit === "calories") {
    return [
      {
        id: crypto.randomUUID(),
        label: "Malnutrition",
        upperBound: 1599,
        color: DEFAULT_ZONE_COLORS.critical_low,
      },
      {
        id: crypto.randomUUID(),
        label: "Slightly Low",
        lowerBound: 1600,
        upperBound: 1799,
        color: DEFAULT_ZONE_COLORS.warning_low,
      },
      {
        id: crypto.randomUUID(),
        label: "Ideal Intake",
        lowerBound: 1800,
        upperBound: 2200,
        color: DEFAULT_ZONE_COLORS.ideal,
      },
      {
        id: crypto.randomUUID(),
        label: "Slightly High",
        lowerBound: 2201,
        upperBound: 2500,
        color: DEFAULT_ZONE_COLORS.warning_high,
      },
      {
        id: crypto.randomUUID(),
        label: "Overeating",
        lowerBound: 2501,
        color: DEFAULT_ZONE_COLORS.critical_high,
      },
    ];
  }
  return [
    {
      id: crypto.randomUUID(),
      label: "Target Zone",
      lowerBound: 0,
      upperBound: 100,
      color: DEFAULT_ZONE_COLORS.ideal,
    },
    {
      id: crypto.randomUUID(),
      label: "High Zone",
      lowerBound: 101,
      color: DEFAULT_ZONE_COLORS.warning_high,
    },
  ];
};
const createDefaultLogTemplatesForGoal = (
  unit?: string,
): MetricLogTemplate[] => {
  /* ... no changes ... */
  if (unit === "emails" || unit === "items" || unit === "count") {
    return [
      {
        id: crypto.randomUUID(),
        name: "Cleared 10",
        value: -10,
        description: "Remove 10 items",
      },
      {
        id: crypto.randomUUID(),
        name: "Cleared 25",
        value: -25,
        description: "Remove 25 items",
      },
      {
        id: crypto.randomUUID(),
        name: "Added 5",
        value: 5,
        description: "Add 5 items",
      },
    ];
  } else if (unit === "calories") {
    return [
      {
        id: crypto.randomUUID(),
        name: "Small Snack",
        value: 150,
        description: "~150 kcal",
      },
      {
        id: crypto.randomUUID(),
        name: "Regular Meal",
        value: 600,
        description: "~600 kcal",
      },
      {
        id: crypto.randomUUID(),
        name: "Large Treat",
        value: 400,
        description: "~400 kcal",
      },
    ];
  }
  return [];
};

// Helper to create a default goal
const createDefaultGoal = (
  name = "My Metric",
  unit = "units",
  initialValue = 0,
): MetricGoal => {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name,
    unit: unit,
    currentValue: initialValue,
    zones: createDefaultMetricZonesForGoal(unit),
    logTemplates: createDefaultLogTemplatesForGoal(unit),
    log:
      initialValue !== undefined // Add initial log entry if initialValue is provided
        ? [
            {
              id: crypto.randomUUID(),
              timestamp: timestamp,
              valueLogged: initialValue, // This is the absolute value
              valueDelta: initialValue, // For the first entry, delta can be same as value
              notes: "Initial value",
            },
          ]
        : [],
    creationTimestamp: timestamp,
    lastLogTimestamp: initialValue !== undefined ? timestamp : undefined,
    description: `Tracking ${name}.`,
    displayMin:
      unit === "emails" ||
      unit === "items" ||
      unit === "count" ||
      unit === "calories"
        ? 0
        : undefined,
  };
};

// Helper to create default chart configurations
const createDefaultChartsForGoal = (goalUnit?: string): ChartConfig[] => {
  const charts: ChartConfig[] = [
    {
      id: crypto.randomUUID(),
      title: "Raw Logged Values",
      renderType: "raw_values",
    },
  ];

  // Add a daily sum chart if the unit suggests deltas are meaningful (like calories, alcohol units)
  if (
    goalUnit === "calories" ||
    goalUnit === "alcohol units" ||
    goalUnit === "exercise minutes" /* etc. */
  ) {
    charts.push({
      id: crypto.randomUUID(),
      title: "Daily Totals",
      renderType: "aggregated_sum",
      aggregationTimePeriod: "daily",
    });
    charts.push({
      id: crypto.randomUUID(),
      title: "7-Day Moving Average (Daily Totals)",
      renderType: "moving_average", // This would average the *daily sums*
      movingAverageTimePeriod: "custom", // To average over 7 days
      movingAverageCustomSeconds: 7 * 24 * 60 * 60,
      // It implies that the source for moving average is daily aggregated sums. This needs careful thought in implementation.
      // Or, moving average could apply directly to raw_values or valueDeltas.
    });
  }
  return charts;
};

const DEFAULT_CONFIG: MetricGoalTrackerConfig = {
  widgetTitle: "Metric Tracker",
  goal: createDefaultGoal("Inbox Zero", "emails", 50), // Example default goal
  charts: createDefaultChartsForGoal("emails"), // Default charts for the default goal
};

// Sanitizer for a single MetricGoal
const sanitizeMetricGoal = (
  g: any,
  defaultUnit: string = "units",
): MetricGoal | null => {
  if (!g || typeof g.id !== "string") return null; // Basic check

  const currentVal =
    g.currentValue !== undefined && !isNaN(parseFloat(g.currentValue))
      ? parseFloat(g.currentValue)
      : 0;
  const unit = typeof g.unit === "string" ? g.unit.trim() : defaultUnit;

  let zones: MetricZone[] = [];
  if (Array.isArray(g.zones) && g.zones.length > 0) {
    zones = g.zones
      .map((z: any): MetricZone => {
        const lowerBound =
          z.lowerBound !== undefined &&
          z.lowerBound !== null &&
          z.lowerBound !== ""
            ? parseFloat(z.lowerBound)
            : undefined;
        const upperBound =
          z.upperBound !== undefined &&
          z.upperBound !== null &&
          z.upperBound !== ""
            ? parseFloat(z.upperBound)
            : undefined;
        return {
          id: z.id || crypto.randomUUID(),
          label:
            typeof z.label === "string" && z.label.trim()
              ? z.label.trim()
              : "Unnamed Zone",
          color:
            typeof z.color === "string" ? z.color : DEFAULT_ZONE_COLORS.good,
          lowerBound: isNaN(lowerBound as number) ? undefined : lowerBound,
          upperBound: isNaN(upperBound as number) ? undefined : upperBound,
          description:
            typeof z.description === "string" ? z.description : undefined,
        };
      })
      .filter(Boolean) as MetricZone[];
  } else {
    zones = createDefaultMetricZonesForGoal(unit);
  }

  let logTemplates: MetricLogTemplate[] = [];
  if (Array.isArray(g.logTemplates)) {
    logTemplates = g.logTemplates
      .map((lt: any): MetricLogTemplate | null => {
        if (
          !lt ||
          typeof lt.name !== "string" ||
          typeof lt.value === "undefined"
        )
          return null; // Value can be 0
        const templateVal = parseFloat(lt.value);
        if (isNaN(templateVal)) return null;
        return {
          id: lt.id || crypto.randomUUID(),
          name: lt.name.trim() || "Unnamed Template",
          value: templateVal,
          description:
            typeof lt.description === "string"
              ? lt.description.trim()
              : undefined,
        };
      })
      .filter(Boolean) as MetricLogTemplate[];
  } else {
    logTemplates = createDefaultLogTemplatesForGoal(unit);
  }

  const newGoal: MetricGoal = {
    id: g.id,
    name:
      typeof g.name === "string" && g.name.trim()
        ? g.name.trim()
        : "Unnamed Goal",
    unit: unit,
    currentValue: currentVal, // Will be overridden by log if log exists
    zones: zones,
    logTemplates: logTemplates,
    log: Array.isArray(g.log)
      ? g.log
          .map(
            (l: any): MetricAdjustmentLogEntry => ({
              id: l.id || crypto.randomUUID(),
              timestamp:
                typeof l.timestamp === "string"
                  ? l.timestamp
                  : new Date().toISOString(),
              valueLogged:
                typeof l.valueLogged === "number" ? l.valueLogged : 0,
              valueDelta:
                typeof l.valueDelta === "number"
                  ? l.valueDelta
                  : l.valueLogged -
                    (g.log.findLast(
                      (prevL: any) =>
                        new Date(prevL.timestamp) < new Date(l.timestamp),
                    )?.valueLogged ?? 0),
              notes: typeof l.notes === "string" ? l.notes : undefined,
            }),
          )
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
      : [],
    creationTimestamp:
      typeof g.creationTimestamp === "string"
        ? g.creationTimestamp
        : new Date().toISOString(),
    description: typeof g.description === "string" ? g.description : undefined,
    lastLogTimestamp:
      typeof g.lastLogTimestamp === "string" ? g.lastLogTimestamp : undefined,
    displayMin:
      g.displayMin !== undefined && !isNaN(parseFloat(g.displayMin))
        ? parseFloat(g.displayMin)
        : undefined,
    displayMax:
      g.displayMax !== undefined && !isNaN(parseFloat(g.displayMax))
        ? parseFloat(g.displayMax)
        : undefined,
  };

  if (newGoal.log.length > 0) {
    newGoal.currentValue = newGoal.log[0].valueLogged; // log is sorted, [0] is latest
    if (
      !newGoal.lastLogTimestamp ||
      new Date(newGoal.log[0].timestamp) > new Date(newGoal.lastLogTimestamp)
    ) {
      newGoal.lastLogTimestamp = newGoal.log[0].timestamp;
    }
    // Retroactively try to calculate valueDelta if missing from old logs
    for (let i = 0; i < newGoal.log.length; i++) {
      if (newGoal.log[i].valueDelta === undefined) {
        const prevEntry = newGoal.log[i + 1]; // Log is sorted newest first
        newGoal.log[i].valueDelta =
          newGoal.log[i].valueLogged - (prevEntry ? prevEntry.valueLogged : 0);
      }
    }
  } else if (g.currentValue !== undefined) {
    // If no logs, but there was a currentValue from an old config
    // Create an initial log entry from this currentValue
    const initialTimestamp =
      newGoal.creationTimestamp || new Date().toISOString();
    newGoal.log.push({
      id: crypto.randomUUID(),
      timestamp: initialTimestamp,
      valueLogged: newGoal.currentValue,
      valueDelta: newGoal.currentValue, // Delta is the full value for the first entry
      notes: "Initial value from previous configuration",
    });
    newGoal.lastLogTimestamp = initialTimestamp;
  }
  return newGoal;
};

// Sanitizer for ChartConfig
const sanitizeChartConfig = (cc: any): ChartConfig | null => {
  if (!cc || typeof cc.id !== "string" || typeof cc.title !== "string")
    return null;
  const validRenderTypes: ChartRenderType[] = [
    "raw_values",
    "aggregated_sum",
    "moving_average",
  ];
  if (!validRenderTypes.includes(cc.renderType)) return null;

  const validTimePeriods: TimePeriod[] = [
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "custom",
  ];

  const sanitized: ChartConfig = {
    id: cc.id,
    title: cc.title.trim() || "Untitled Chart",
    renderType: cc.renderType,
    yAxisDisplayMin:
      cc.yAxisDisplayMin !== undefined && !isNaN(parseFloat(cc.yAxisDisplayMin))
        ? parseFloat(cc.yAxisDisplayMin)
        : undefined,
    yAxisDisplayMax:
      cc.yAxisDisplayMax !== undefined && !isNaN(parseFloat(cc.yAxisDisplayMax))
        ? parseFloat(cc.yAxisDisplayMax)
        : undefined,
  };

  if (
    cc.renderType === "aggregated_sum" ||
    cc.renderType === "moving_average"
  ) {
    const periodField =
      cc.renderType === "aggregated_sum"
        ? "aggregationTimePeriod"
        : "movingAverageTimePeriod";
    const customSecondsField =
      cc.renderType === "aggregated_sum"
        ? "aggregationCustomSeconds"
        : "movingAverageCustomSeconds";

    if (cc[periodField] && validTimePeriods.includes(cc[periodField])) {
      sanitized[periodField] = cc[periodField];
      if (cc[periodField] === "custom") {
        sanitized[customSecondsField] =
          cc[customSecondsField] !== undefined &&
          !isNaN(parseInt(cc[customSecondsField])) &&
          parseInt(cc[customSecondsField]) > 0
            ? parseInt(cc[customSecondsField])
            : 86400; // Default to 1 day
      }
    } else {
      // Default if invalid or missing
      sanitized[periodField] = "daily";
    }
  }
  return sanitized;
};

export const metricGoalTrackerWidgetDefinition: WidgetDefinition<
  MetricGoalTrackerConfig,
  Partial<MetricGoalTrackerConfig>
> = {
  type: "metric-goal-tracker",
  displayName: "Metric Tracker (Single Goal)", // Updated display name
  icon: "📊", // More generic chart icon
  component: MetricGoalTrackerWidget,
  defaultConfig: DEFAULT_CONFIG,
  defaultLayout: { w: 6, h: 8 }, // Adjusted default height might change based on multi-chart display
  configComponent: MetricGoalTrackerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = DEFAULT_CONFIG;
    const newConfig: MetricGoalTrackerConfig = {
      widgetTitle:
        loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle,
      goal: undefined, // Initialize
      charts: [], // Initialize
    };

    // Sanitize Goal
    if (loadedConfig?.goal) {
      newConfig.goal = sanitizeMetricGoal(loadedConfig.goal);
    } else if (
      loadedConfig?.goals &&
      Array.isArray(loadedConfig.goals) &&
      loadedConfig.goals.length > 0
    ) {
      // Migrating from old multi-goal config: take the first goal
      console.warn(
        `Migrating MetricGoalTracker widget '${widgetId}': Using first goal from old multi-goal config.`,
      );
      newConfig.goal = sanitizeMetricGoal(loadedConfig.goals[0]);
    }
    // If no goal after trying to load/migrate, use a default one
    if (!newConfig.goal) {
      newConfig.goal = defaults.goal
        ? sanitizeMetricGoal(defaults.goal)
        : createDefaultGoal();
    }

    // Sanitize Charts
    if (loadedConfig?.charts && Array.isArray(loadedConfig.charts)) {
      newConfig.charts = loadedConfig.charts
        .map((c) => sanitizeChartConfig(c))
        .filter(Boolean) as ChartConfig[];
    }
    // If no charts after sanitization, or if migrating from old config that had no charts concept
    if (newConfig.charts.length === 0) {
      newConfig.charts = createDefaultChartsForGoal(newConfig.goal?.unit);
    }

    return newConfig;
  },
};
