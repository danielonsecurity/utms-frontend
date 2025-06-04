// metricGoalTracker/MetricGoalTrackerWidget.tsx
import React, { useState, useMemo, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
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
import { Modal } from "../../common/Modal/Modal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  Label,
  BarChart,
  Bar,
} from "recharts";

// --- Log Value Modal State & Logic (Mostly unchanged, but needs to pass valueDelta) ---
interface LogValueModalState {
  isOpen: boolean;
  goalId: string | null; // Technically, we only have one goal, so this might be redundant if goal is always present
  goalName?: string;
  goalUnit?: string;
  currentValueBeforeLog?: number;
  availableTemplates?: MetricLogTemplate[];
  logMode: "absolute" | "relative" | "template";
  absoluteValue: string;
  relativeChangeValue: string;
  selectedTemplateId: string | null;
  templateQuantity: string;
  notes: string;
}

const initialLogModalState: Omit<
  LogValueModalState,
  | "isOpen"
  | "goalId"
  | "goalName"
  | "goalUnit"
  | "currentValueBeforeLog"
  | "availableTemplates"
> = {
  logMode: "absolute",
  absoluteValue: "",
  relativeChangeValue: "",
  selectedTemplateId: null,
  templateQuantity: "1",
  notes: "",
};

// --- Helper: getCurrentMetricZone (Unchanged for now, applies to raw values) ---
const getCurrentMetricZone = (
  value: number,
  goal: MetricGoal,
): MetricZone | null => {
  // ... (previous implementation of getCurrentMetricZone)
  if (!goal.zones || goal.zones.length === 0) return null;
  for (const zone of goal.zones) {
    const lowerMatch =
      zone.lowerBound === undefined || value >= zone.lowerBound;
    const upperMatch =
      zone.upperBound === undefined || value <= zone.upperBound;
    if (lowerMatch && upperMatch) return zone;
  }
  if (goal.zones.length > 0) {
    const maxUpperBound = Math.max(
      ...goal.zones
        .map((z) => z.upperBound ?? -Infinity)
        .filter((v) => v !== -Infinity),
    );
    if (value > maxUpperBound && isFinite(maxUpperBound)) {
      const highestZone = goal.zones.find(
        (z) =>
          z.upperBound === maxUpperBound ||
          (z.upperBound === undefined && z.lowerBound === maxUpperBound),
      );
      return {
        id: "inferred-critical-high",
        label: highestZone?.label.includes("High")
          ? highestZone.label
          : "Critically High",
        color: highestZone?.color || "darkred",
        lowerBound: maxUpperBound + 0.00001,
      };
    }
    const minLowerBound = Math.min(
      ...goal.zones
        .map((z) => z.lowerBound ?? Infinity)
        .filter((v) => v !== Infinity),
    );
    if (value < minLowerBound && isFinite(minLowerBound)) {
      const lowestZone = goal.zones.find(
        (z) =>
          z.lowerBound === minLowerBound ||
          (z.lowerBound === undefined && z.upperBound === minLowerBound),
      );
      return {
        id: "inferred-critical-low",
        label: lowestZone?.label.includes("Low")
          ? lowestZone.label
          : "Critically Low",
        color: lowestZone?.color || "darkred",
        upperBound: minLowerBound - 0.00001,
      };
    }
  }
  return null;
};

// --- Time Period to Seconds Conversion ---
const timePeriodToSeconds = (
  period?: TimePeriod,
  customSeconds?: number,
): number => {
  switch (period) {
    case "hourly":
      return 60 * 60;
    case "daily":
      return 24 * 60 * 60;
    case "weekly":
      return 7 * 24 * 60 * 60;
    case "monthly":
      return 30 * 24 * 60 * 60; // Approximate
    case "custom":
      return customSeconds && customSeconds > 0 ? customSeconds : 24 * 60 * 60; // Default custom to 1 day
    default:
      return 24 * 60 * 60; // Default to daily
  }
};

// --- Chart Data Processing ---
interface ProcessedChartDataPoint {
  timestamp: number; // Unix timestamp for internal sorting/bucketing
  name: string; // Formatted string for X-axis label
  value: number; // Value for Y-axis
  notes?: string; // Original notes if applicable
}

const processChartData = (
  goal: MetricGoal,
  chartConfig: ChartConfig,
): ProcessedChartDataPoint[] => {
  if (!goal.log || goal.log.length === 0) return [];

  const sortedLog = [...goal.log].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  ); // Ascending by time

  switch (chartConfig.renderType) {
    case "raw_values":
      return sortedLog.map((entry) => ({
        timestamp: new Date(entry.timestamp).getTime(),
        name: new Date(entry.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        value: entry.valueLogged, // Plot the absolute value of the metric
        notes: entry.notes,
      }));

    case "aggregated_sum": {
      const periodSeconds = timePeriodToSeconds(
        chartConfig.aggregationTimePeriod,
        chartConfig.aggregationCustomSeconds,
      );
      if (periodSeconds <= 0) return [];

      const aggregated: { [bucketStartTimestamp: number]: number } = {};

      sortedLog.forEach((entry) => {
        const entryTs = new Date(entry.timestamp).getTime();
        // Normalize to the start of the period (e.g., start of the day, start of the hour)
        const bucketStartTimestamp =
          Math.floor(entryTs / (periodSeconds * 1000)) * (periodSeconds * 1000);

        const delta = entry.valueDelta ?? 0; // Use valueDelta for sums
        aggregated[bucketStartTimestamp] =
          (aggregated[bucketStartTimestamp] || 0) + delta;
      });

      return Object.entries(aggregated)
        .map(([ts, sum]) => {
          const date = new Date(parseInt(ts));
          let labelFormat: Intl.DateTimeFormatOptions = {
            month: "short",
            day: "numeric",
          };
          if (periodSeconds < 24 * 60 * 60) labelFormat.hour = "numeric"; // Add hour if period is less than a day
          return {
            timestamp: parseInt(ts),
            name: date.toLocaleDateString(undefined, labelFormat),
            value: sum,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Ensure sorted by time
    }

    case "moving_average": {
      const windowSeconds = timePeriodToSeconds(
        chartConfig.movingAverageTimePeriod,
        chartConfig.movingAverageCustomSeconds,
      );
      if (windowSeconds <= 0) return [];

      const results: ProcessedChartDataPoint[] = [];
      // For moving average, we typically average the deltas or raw values over a sliding window.
      // Let's average the 'valueDelta' to see trends in additions/subtractions.
      // If you want to average the raw metric value, use entry.valueLogged instead of entry.valueDelta.

      for (let i = 0; i < sortedLog.length; i++) {
        const currentEntry = sortedLog[i];
        const currentTs = new Date(currentEntry.timestamp).getTime();
        const windowStartTs = currentTs - windowSeconds * 1000;

        let sum = 0;
        let count = 0;
        // Iterate backwards from current point to find entries within the window
        for (let j = i; j >= 0; j--) {
          const entryInWindow = sortedLog[j];
          const entryInWindowTs = new Date(entryInWindow.timestamp).getTime();
          if (entryInWindowTs >= windowStartTs) {
            sum += entryInWindow.valueDelta ?? 0; // Summing deltas
            count++;
          } else {
            break; // Past the window
          }
        }
        if (count > 0) {
          results.push({
            timestamp: currentTs,
            name: new Date(currentTs).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            value: sum / count,
            notes: `Avg over ${count} entries`,
          });
        }
      }
      return results;
    }
    default:
      return [];
  }
};

export const MetricGoalTrackerWidget: React.FC<
  WidgetProps<MetricGoalTrackerConfig>
> = ({ id, config, onRemove, onConfigChange, onWidgetConfigure }) => {
  const [logModalState, setLogModalState] = useState<LogValueModalState>({
    isOpen: false,
    goalId: null,
    ...initialLogModalState,
  });

  const currentGoal = config.goal; // The single goal

  const openLogModal = () => {
    if (!currentGoal) return;

    // Determine the default log mode
    const defaultLogMode: LogValueModalState["logMode"] =
      currentGoal.logTemplates && currentGoal.logTemplates.length > 0
        ? "template"
        : "absolute"; // Fallback to 'absolute' if no templates

    // Pre-select the first template if mode is 'template' and templates exist
    const defaultSelectedTemplateId =
      defaultLogMode === "template" &&
      currentGoal.logTemplates &&
      currentGoal.logTemplates.length > 0
        ? currentGoal.logTemplates[0].id
        : null;

    setLogModalState({
      isOpen: true,
      goalId: currentGoal.id,
      goalName: currentGoal.name,
      goalUnit: currentGoal.unit,
      currentValueBeforeLog: currentGoal.currentValue,
      availableTemplates: currentGoal.logTemplates || [],

      // Reset other mode-specific fields from initialLogModalState first
      ...initialLogModalState,

      // Then override with determined defaults
      logMode: defaultLogMode,
      selectedTemplateId: defaultSelectedTemplateId,
      // templateQuantity can remain "1" from initialLogModalState or you can clear it
      // absoluteValue: "", // ensure these are reset if coming from initialLogModalState
      // relativeChangeValue: "", // ensure these are reset
      // notes: "", // ensure these are reset
    });
  };

  const handleSaveLog = () => {
    if (!currentGoal || !logModalState.goalId) return; // Should always have currentGoal if modal is open

    const {
      logMode,
      absoluteValue,
      relativeChangeValue,
      selectedTemplateId,
      templateQuantity,
      notes,
      currentValueBeforeLog = 0,
      availableTemplates = [],
    } = logModalState;

    let finalValueToLog: number;
    let valueDelta: number | undefined = undefined;

    if (logMode === "absolute") {
      if (absoluteValue.trim() === "") {
        alert("New value cannot be empty.");
        return;
      }
      finalValueToLog = parseFloat(absoluteValue);
      if (isNaN(finalValueToLog)) {
        alert("New value must be a number.");
        return;
      }
      valueDelta = finalValueToLog - currentValueBeforeLog;
    } else if (logMode === "relative") {
      if (relativeChangeValue.trim() === "") {
        alert("Change value cannot be empty.");
        return;
      }
      const change = parseFloat(relativeChangeValue);
      if (isNaN(change)) {
        alert("Change value must be a number.");
        return;
      }
      finalValueToLog = currentValueBeforeLog + change;
      valueDelta = change;
    } else if (logMode === "template") {
      if (!selectedTemplateId) {
        alert("Please select a template.");
        return;
      }
      const template = availableTemplates.find(
        (t) => t.id === selectedTemplateId,
      );
      if (!template) {
        alert("Selected template not found.");
        return;
      }
      if (templateQuantity.trim() === "") {
        alert("Quantity cannot be empty.");
        return;
      }
      const quantity = parseFloat(templateQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        alert("Quantity must be a positive number.");
        return;
      }

      valueDelta = template.value * quantity;
      finalValueToLog = currentValueBeforeLog + valueDelta;
    } else {
      alert("Invalid log mode.");
      return;
    }

    if (isNaN(finalValueToLog)) {
      alert("Calculated value is not a number.");
      return;
    }

    const newEntry: MetricAdjustmentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      valueLogged: finalValueToLog,
      valueDelta: valueDelta, // Store the calculated delta
      notes: notes.trim() || undefined,
    };

    const updatedGoal: MetricGoal = {
      ...currentGoal,
      currentValue: finalValueToLog,
      log: [newEntry, ...currentGoal.log].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
      lastLogTimestamp: newEntry.timestamp,
    };

    onConfigChange?.({ ...config, goal: updatedGoal });
    setLogModalState({ ...logModalState, isOpen: false });
  };

  // getChartDataAndBounds: Y-axis scaling for a given dataset
  // This will now be called per chart, potentially with chart-specific displayMin/Max
  const getChartAxisBounds = useCallback(
    (
      data: ProcessedChartDataPoint[],
      goalRef: MetricGoal | undefined, // Reference to the goal for units, global displayMin/Max, zones
      chartConfigRef: ChartConfig, // For chart-specific yAxisDisplayMin/Max
    ) => {
      const yAxisDisplayMin =
        chartConfigRef.yAxisDisplayMin ?? goalRef?.displayMin;
      const yAxisDisplayMax =
        chartConfigRef.yAxisDisplayMax ?? goalRef?.displayMax;

      if (data.length === 0) {
        const currentVal = goalRef?.currentValue ?? 0;
        let yMin = yAxisDisplayMin ?? currentVal - 5;
        let yMax = yAxisDisplayMax ?? currentVal + 5;
        if (yMax - yMin < 10) {
          const mid = (yMin + yMax) / 2;
          yMin = mid - 5;
          yMax = mid + 5;
        }
        if (
          yAxisDisplayMin === undefined &&
          yMin < 0 &&
          goalRef &&
          goalRef.unit !== "°C" &&
          goalRef.unit !== "°F" &&
          goalRef.zones.every((z) => (z.lowerBound ?? 0) >= 0)
        ) {
          yMin = 0;
        }
        if (yMin >= yMax) yMax = yMin + 10;
        return { yMin, yMax };
      }

      const allValues = data.map((d) => d.value);
      let yMinCalc = Math.min(...allValues);
      let yMaxCalc = Math.max(...allValues);

      if (yAxisDisplayMin !== undefined) yMinCalc = yAxisDisplayMin;
      if (yAxisDisplayMax !== undefined) yMaxCalc = yAxisDisplayMax;

      const MIN_SPAN_FACTOR = 0.1; // 10% of max magnitude or 1
      const minSpan = Math.max(
        1,
        Math.abs(yMaxCalc * MIN_SPAN_FACTOR),
        Math.abs(yMinCalc * MIN_SPAN_FACTOR),
      );
      if (yMaxCalc - yMinCalc < minSpan && data.length > 1) {
        // only if more than one point
        const midPoint = (yMinCalc + yMaxCalc) / 2;
        yMinCalc = midPoint - minSpan / 2;
        yMaxCalc = midPoint + minSpan / 2;
        if (yMinCalc === yMaxCalc) yMaxCalc = yMinCalc + 1;
      } else if (data.length === 1) {
        // Single data point, give it some room
        yMinCalc = yMinCalc - Math.max(5, Math.abs(yMinCalc * 0.5));
        yMaxCalc = yMaxCalc + Math.max(5, Math.abs(yMaxCalc * 0.5));
        if (yMinCalc === yMaxCalc) yMaxCalc = yMinCalc + 10;
      }

      const PADDING_FACTOR = 0.1;
      if (yAxisDisplayMin === undefined && data.length > 1)
        yMinCalc -= Math.abs(yMaxCalc - yMinCalc) * PADDING_FACTOR;
      if (yAxisDisplayMax === undefined && data.length > 1)
        yMaxCalc += Math.abs(yMaxCalc - yMinCalc) * PADDING_FACTOR;

      if (
        yAxisDisplayMin === undefined &&
        yMinCalc < 0 &&
        goalRef &&
        goalRef.unit !== "°C" &&
        goalRef.unit !== "°F"
      ) {
        const allDataPositive = allValues.every((v) => v >= 0);
        // For aggregated/averaged charts, zones might not directly apply to y-values.
        // Only apply floor if data itself is positive.
        if (allDataPositive) yMinCalc = 0;
      }

      if (yMinCalc >= yMaxCalc) {
        if (yMinCalc === 0 && yMaxCalc <= 0) yMaxCalc = 10;
        else yMaxCalc = yMinCalc + Math.max(10, Math.abs(yMinCalc * 0.2));
      }
      return { yMin: Math.floor(yMinCalc), yMax: Math.ceil(yMaxCalc) }; // Floor/Ceil for cleaner ticks
    },
    [],
  );

  // --- Render ---
  if (!currentGoal) {
    return (
      <BaseWidget
        id={id}
        title={config.widgetTitle || "Metric Tracker"}
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <div style={{ padding: "20px", textAlign: "center", color: "#777" }}>
          <p>No metric goal configured.</p>
          <p>Please configure this widget to set up a goal to track.</p>
          {onWidgetConfigure && (
            <button onClick={() => onWidgetConfigure(id)}>
              Configure Widget
            </button>
          )}
        </div>
      </BaseWidget>
    );
  }

  // Determine overall current zone based on goal's currentValue for header display
  const overallCurrentActualZone = getCurrentMetricZone(
    currentGoal.currentValue,
    currentGoal,
  );
  const overallZoneColor =
    overallCurrentActualZone?.color?.replace(
      /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
      `rgba($1,$2,$3,1)`,
    ) || "#333";

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle || currentGoal.name}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          padding: "10px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Goal Header */}
        <div
          style={{
            borderBottom: `2px solid ${overallZoneColor}`,
            paddingBottom: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "2px" }}>
                {currentGoal.name}
              </h3>
              {currentGoal.description && (
                <p
                  style={{
                    fontSize: "0.8em",
                    color: "#666",
                    margin: "0 0 5px 0",
                  }}
                >
                  {currentGoal.description}
                </p>
              )}
            </div>
            <div
              style={{
                textAlign: "right",
                paddingLeft: "10px",
                minWidth: "120px",
              }}
            >
              <span
                style={{
                  fontSize: "1.6em",
                  fontWeight: "bold",
                  color: overallZoneColor,
                }}
              >
                {currentGoal.currentValue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                <span style={{ fontSize: "0.7em", fontWeight: "normal" }}>
                  {currentGoal.unit}
                </span>
              </span>
              {overallCurrentActualZone && (
                <div
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                    color: overallZoneColor,
                    marginTop: "0px",
                  }}
                >
                  {overallCurrentActualZone.label}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={openLogModal}
            style={{
              padding: "10px 15px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              fontSize: "1em",
              marginTop: "10px",
            }}
          >
            Log New Value for {currentGoal.name}
          </button>
        </div>

        {/* Charts Area */}
        <div style={{ flexGrow: 1, overflowY: "auto", paddingRight: "5px" }}>
          {(config.charts || []).length === 0 && (
            <p
              style={{ textAlign: "center", color: "#777", marginTop: "20px" }}
            >
              No chart views defined. Add some in settings!
            </p>
          )}
          {(config.charts || []).map((chartConf) => {
            const chartData = processChartData(currentGoal, chartConf);
            const { yMin, yMax } = getChartAxisBounds(
              chartData,
              currentGoal,
              chartConf,
            );
            const isBarChart = chartConf.renderType === "aggregated_sum";

            return (
              <div
                key={chartConf.id}
                style={{
                  border: `1px solid #ccc`,
                  borderRadius: "8px",
                  padding: "15px",
                  marginBottom: "20px",
                  background: "white",
                  boxShadow: `0 2px 4px rgba(0,0,0,0.05)`,
                }}
              >
                <h5
                  style={{
                    marginTop: 0,
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  {chartConf.title}
                </h5>
                {chartData.length > 0 ? (
                  <div style={{ height: "280px" }}>
                    {" "}
                    {/* Consider making height configurable per chart too */}
                    <ResponsiveContainer width="100%" height="100%">
                      {isBarChart ? (
                        <BarChart
                          data={chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 25 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e0e0e0"
                          />
                          <XAxis
                            dataKey="name"
                            fontSize="0.75em"
                            tick={{ fill: "#666" }}
                            angle={-15}
                            textAnchor="end"
                            height={40}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            fontSize="0.75em"
                            domain={[yMin, yMax]}
                            tick={{ fill: "#666" }}
                            allowDataOverflow={false}
                            type="number"
                            unit={` ${currentGoal.unit}`}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "0.85em",
                              borderRadius: "4px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                            formatter={(value: number) => [
                              `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${chartConf.renderType === "aggregated_sum" ? currentGoal.unit + "/period" : currentGoal.unit}`,
                              chartConf.title,
                            ]}
                            labelFormatter={(label, payload) =>
                              payload?.[0]?.payload?.timestamp
                                ? new Date(
                                    payload[0].payload.timestamp,
                                  ).toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : label
                            }
                          />
                          {/* Zones might not be directly applicable to aggregated/averaged data in the same way
                                 Only show zones if chart type is raw_values or if explicitly configured */}
                          {chartConf.renderType === "raw_values" &&
                            currentGoal.zones.map((zone) => {
                              const z_y1 =
                                zone.lowerBound !== undefined
                                  ? Math.max(yMin, zone.lowerBound)
                                  : yMin;
                              const z_y2 =
                                zone.upperBound !== undefined
                                  ? Math.min(yMax, zone.upperBound)
                                  : yMax;
                              if (
                                z_y1 === undefined ||
                                z_y2 === undefined ||
                                z_y1 >= z_y2
                              )
                                return null;
                              return (
                                <ReferenceArea
                                  key={zone.id}
                                  y1={z_y1}
                                  y2={z_y2}
                                  stroke="transparent"
                                  fill={zone.color || "#8884d8"}
                                  fillOpacity={0.1}
                                >
                                  <Label
                                    value={zone.label}
                                    position="insideTopLeft"
                                    fontSize="0.7em"
                                    fill="#555"
                                    dx={5}
                                    dy={5}
                                    angle={0}
                                  />
                                </ReferenceArea>
                              );
                            })}
                          <Bar
                            dataKey="value"
                            fill="#8884d8"
                            name={currentGoal.unit}
                          />
                        </BarChart>
                      ) : (
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 25 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e0e0e0"
                          />
                          <XAxis
                            dataKey="name"
                            fontSize="0.75em"
                            tick={{ fill: "#666" }}
                            angle={-15}
                            textAnchor="end"
                            height={40}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            fontSize="0.75em"
                            domain={[yMin, yMax]}
                            tick={{ fill: "#666" }}
                            allowDataOverflow={false}
                            type="number"
                            unit={` ${currentGoal.unit}`}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "0.85em",
                              borderRadius: "4px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                            formatter={(value: number, name, props) => [
                              `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currentGoal.unit} ${props.payload.notes ? " (" + props.payload.notes + ")" : ""}`,
                              chartConf.title,
                            ]}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          {/* Zones might not be directly applicable to aggregated/averaged data in the same way
                                 Only show zones if chart type is raw_values or if explicitly configured */}
                          {chartConf.renderType === "raw_values" &&
                            currentGoal.zones.map((zone) => {
                              const z_y1 =
                                zone.lowerBound !== undefined
                                  ? Math.max(yMin, zone.lowerBound)
                                  : yMin;
                              const z_y2 =
                                zone.upperBound !== undefined
                                  ? Math.min(yMax, zone.upperBound)
                                  : yMax;
                              if (
                                z_y1 === undefined ||
                                z_y2 === undefined ||
                                z_y1 >= z_y2
                              )
                                return null;
                              return (
                                <ReferenceArea
                                  key={zone.id}
                                  y1={z_y1}
                                  y2={z_y2}
                                  stroke="transparent"
                                  fill={zone.color || "#8884d8"}
                                  fillOpacity={0.1}
                                >
                                  <Label
                                    value={zone.label}
                                    position="insideTopLeft"
                                    fontSize="0.7em"
                                    fill="#555"
                                    dx={5}
                                    dy={5}
                                    angle={0}
                                  />
                                </ReferenceArea>
                              );
                            })}
                          <Line
                            type="monotone"
                            dataKey="value"
                            name={currentGoal.unit}
                            stroke="#0056b3"
                            strokeWidth={2}
                            dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                            activeDot={{ r: 5, strokeWidth: 1 }}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "0.9em",
                      color: "#888",
                      textAlign: "center",
                      margin: "20px 0",
                      fontStyle: "italic",
                    }}
                  >
                    Not enough data to display this chart. Log some values!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Modal (largely same JSX as before) */}
      {logModalState.isOpen && currentGoal && (
        <Modal
          isOpen={logModalState.isOpen}
          onClose={() => setLogModalState({ ...logModalState, isOpen: false })}
          title={`Log Value for: ${logModalState.goalName || "Goal"}`}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <p style={{ fontSize: "0.9em", color: "#555", marginTop: 0 }}>
              {" "}
              Current Value:{" "}
              {logModalState.currentValueBeforeLog?.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }) || "N/A"}{" "}
              {logModalState.goalUnit}{" "}
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong>Log as:</strong>
              <label>
                <input
                  type="radio"
                  name="logMode"
                  value="absolute"
                  checked={logModalState.logMode === "absolute"}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      logMode: e.target.value as any,
                    })
                  }
                />{" "}
                Absolute
              </label>
              <label>
                <input
                  type="radio"
                  name="logMode"
                  value="relative"
                  checked={logModalState.logMode === "relative"}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      logMode: e.target.value as any,
                    })
                  }
                />{" "}
                Relative
              </label>
              {logModalState.availableTemplates &&
                logModalState.availableTemplates.length > 0 && (
                  <label>
                    <input
                      type="radio"
                      name="logMode"
                      value="template"
                      checked={logModalState.logMode === "template"}
                      onChange={(e) =>
                        setLogModalState({
                          ...logModalState,
                          logMode: e.target.value as any,
                        })
                      }
                    />{" "}
                    Template
                  </label>
                )}
            </div>
            {logModalState.logMode ===
              "absolute" /* ... modal absolute inputs ... */ && (
              <div>
                {" "}
                <label
                  htmlFor="logAbsoluteValue"
                  style={{ display: "block", marginBottom: "3px" }}
                >
                  New Absolute Value ({logModalState.goalUnit}):
                </label>{" "}
                <input
                  type="number"
                  id="logAbsoluteValue"
                  value={logModalState.absoluteValue}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      absoluteValue: e.target.value,
                    })
                  }
                  placeholder={`Enter new total ${logModalState.goalUnit}`}
                  style={{
                    width: "100%",
                    padding: "8px",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />{" "}
              </div>
            )}
            {logModalState.logMode ===
              "relative" /* ... modal relative inputs (simplified)... */ && (
              <div>
                {" "}
                <label
                  htmlFor="logRelativeChange"
                  style={{ display: "block", marginBottom: "3px" }}
                >
                  Change in Value ({logModalState.goalUnit}):
                </label>{" "}
                <input
                  type="number"
                  id="logRelativeChange"
                  value={logModalState.relativeChangeValue}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      relativeChangeValue: e.target.value,
                    })
                  }
                  placeholder="e.g., 50 (add) or -20 (subtract)"
                  style={{
                    width: "100%",
                    padding: "8px",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />{" "}
              </div>
            )}
            {logModalState.logMode === "template" &&
              logModalState.availableTemplates /* ... modal template inputs ... */ && (
                <>
                  {" "}
                  <div>
                    {" "}
                    <label
                      htmlFor="logTemplateSelect"
                      style={{ display: "block", marginBottom: "3px" }}
                    >
                      Select Template:
                    </label>{" "}
                    <select
                      id="logTemplateSelect"
                      value={logModalState.selectedTemplateId || ""}
                      onChange={(e) =>
                        setLogModalState({
                          ...logModalState,
                          selectedTemplateId: e.target.value || null,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        boxSizing: "border-box",
                      }}
                      autoFocus
                    >
                      {" "}
                      <option value="">-- Select --</option>{" "}
                      {logModalState.availableTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.value.toLocaleString()}{" "}
                          {logModalState.goalUnit})
                        </option>
                      ))}{" "}
                    </select>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label
                      htmlFor="logTemplateQuantity"
                      style={{ display: "block", marginBottom: "3px" }}
                    >
                      Quantity:
                    </label>{" "}
                    <input
                      type="number"
                      id="logTemplateQuantity"
                      value={logModalState.templateQuantity}
                      onChange={(e) =>
                        setLogModalState({
                          ...logModalState,
                          templateQuantity: e.target.value,
                        })
                      }
                      placeholder="e.g., 1, 2.5"
                      min="0.1"
                      step="any"
                      style={{
                        width: "100%",
                        padding: "8px",
                        boxSizing: "border-box",
                      }}
                    />{" "}
                  </div>{" "}
                </>
              )}
            <div>
              {" "}
              <label
                htmlFor="logNotes"
                style={{ display: "block", marginBottom: "3px" }}
              >
                Notes (optional):
              </label>{" "}
              <textarea
                id="logNotes"
                rows={2}
                value={logModalState.notes}
                onChange={(e) =>
                  setLogModalState({ ...logModalState, notes: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />{" "}
            </div>
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              {" "}
              <button
                onClick={() =>
                  setLogModalState({ ...logModalState, isOpen: false })
                }
                style={{ padding: "8px 12px" }}
              >
                Cancel
              </button>{" "}
              <button
                onClick={handleSaveLog}
                style={{
                  padding: "10px 15px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Save Log
              </button>{" "}
            </div>
          </div>
        </Modal>
      )}
    </BaseWidget>
  );
};
