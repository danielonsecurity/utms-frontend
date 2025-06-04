// metricGoalTracker/MetricGoalTrackerWidgetConfigEditor.tsx
import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import {
  MetricGoalTrackerConfig,
  MetricGoal,
  MetricZone,
  MetricLogTemplate,
  ChartConfig,
  ChartRenderType,
  TimePeriod,
} from "./types";

// DEFAULT_ZONE_COLORS and createDefaultMetricZones can be kept or moved to a shared util.
// For brevity here, assume they are available (content unchanged from previous versions).
const DEFAULT_ZONE_COLORS = {
  /* ... */ ideal: "rgba(76, 175, 80, 0.7)",
  good: "rgba(173, 216, 230, 0.7)",
  warning_low: "rgba(255, 193, 7, 0.7)",
  warning_high: "rgba(255, 193, 7, 0.7)",
  critical_low: "rgba(244, 67, 54, 0.7)",
  critical_high: "rgba(244, 67, 54, 0.7)",
};
const createDefaultMetricZones = (unit?: string): MetricZone[] => {
  /* ... */
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
        label: "Too Low",
        upperBound: 60,
        color: DEFAULT_ZONE_COLORS.critical_low,
      },
      {
        id: crypto.randomUUID(),
        label: "Slightly Low",
        lowerBound: 60,
        upperBound: 65,
        color: DEFAULT_ZONE_COLORS.warning_low,
      },
      {
        id: crypto.randomUUID(),
        label: "Ideal Weight",
        lowerBound: 65,
        upperBound: 75,
        color: DEFAULT_ZONE_COLORS.ideal,
      },
      {
        id: crypto.randomUUID(),
        label: "Slightly High",
        lowerBound: 75,
        upperBound: 80,
        color: DEFAULT_ZONE_COLORS.warning_high,
      },
      {
        id: crypto.randomUUID(),
        label: "Too High",
        lowerBound: 80,
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
      label: "Ideal Range",
      lowerBound: 0,
      upperBound: 100,
      color: DEFAULT_ZONE_COLORS.ideal,
    },
  ];
};
// Also for createDefaultLogTemplatesForGoal - assume available
const createDefaultLogTemplatesForGoal = (
  unit?: string,
): MetricLogTemplate[] => {
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
    ];
  }
  return [];
};
// And createDefaultChartsForGoal
const createDefaultChartsForGoal = (goalUnit?: string): ChartConfig[] => {
  const charts: ChartConfig[] = [
    {
      id: crypto.randomUUID(),
      title: "Raw Logged Values",
      renderType: "raw_values",
    },
  ];
  if (
    goalUnit === "calories" ||
    goalUnit === "alcohol units" ||
    goalUnit === "exercise minutes"
  ) {
    charts.push({
      id: crypto.randomUUID(),
      title: "Daily Totals",
      renderType: "aggregated_sum",
      aggregationTimePeriod: "daily",
    });
  }
  return charts;
};

interface NewTemplateState {
  name: string;
  value: string;
  description: string;
}
const initialNewTemplateState: NewTemplateState = {
  name: "",
  value: "",
  description: "",
};

export const MetricGoalTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<MetricGoalTrackerConfig>
> = ({ config, onConfigChange, widgetId }) => {
  // The config now has an optional 'goal' and a 'charts' array.
  // If no goal, we might show a "Setup Goal" button.
  const currentGoal = config.goal;

  const [newTemplateForm, setNewTemplateForm] = useState<NewTemplateState>(
    initialNewTemplateState,
  );

  const ensureGoal = (): MetricGoal => {
    if (currentGoal) return currentGoal;
    // Create a new default goal if none exists
    const newGoal: MetricGoal = {
      id: crypto.randomUUID(),
      name: "My New Metric",
      unit: "units",
      currentValue: 0,
      log: [],
      zones: createDefaultMetricZones("units"),
      logTemplates: [],
      creationTimestamp: new Date().toISOString(),
    };
    // Immediately update the config with this new goal
    // This approach might be too eager if user just opened config.
    // Alternative: only create when user explicitly tries to modify goal properties.
    // For now, let's assume we always want a goal object to work with.
    // onConfigChange({ ...config, goal: newGoal }); // This would cause re-render, let's be careful
    return newGoal; // Return it, but handle updates more explicitly
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  // --- Goal Handlers ---
  const handleGoalDetailChange = (
    field: keyof Omit<
      MetricGoal,
      | "id"
      | "zones"
      | "log"
      | "logTemplates"
      | "creationTimestamp"
      | "lastLogTimestamp"
      | "currentValue"
    >,
    value: any,
  ) => {
    let goalToUpdate = currentGoal;
    if (!goalToUpdate) {
      // If goal doesn't exist, create a default one to update
      goalToUpdate = {
        id: widgetId || crypto.randomUUID(), // Use widgetId as goalId if goal is new
        name: "My Metric",
        unit: "units",
        currentValue: 0,
        log: [],
        zones: createDefaultMetricZones("units"),
        logTemplates: [],
        creationTimestamp: new Date().toISOString(),
      };
    }

    let processedValue = value;
    if (field === "displayMin" || field === "displayMax") {
      processedValue =
        value === "" || value === null || value === undefined
          ? undefined
          : parseFloat(value as string);
      if (isNaN(processedValue as number)) processedValue = undefined;
    }

    const updatedGoal: MetricGoal = {
      ...goalToUpdate,
      [field]: processedValue,
    };

    if (field === "unit" && currentGoal && currentGoal.unit !== value) {
      updatedGoal.zones = createDefaultMetricZones(value as string);
      updatedGoal.logTemplates = createDefaultLogTemplatesForGoal(
        value as string,
      );
      // Potentially regenerate default charts if unit change implies different chart types
      // updatedCharts = createDefaultChartsForGoal(value as string);
      // For now, let's keep charts and let user reconfigure them if needed.
    }
    onConfigChange({ ...config, goal: updatedGoal });
  };

  // Zone handlers (operate on config.goal.zones)
  const handleZoneChange = (
    zoneId: string,
    field: keyof MetricZone,
    value: string,
  ) => {
    if (!currentGoal) return;
    const newZones = currentGoal.zones.map((zone) => {
      if (zone.id === zoneId) {
        let processedValue: string | number | undefined = value;
        if (field === "lowerBound" || field === "upperBound") {
          processedValue = value.trim() === "" ? undefined : parseFloat(value);
          if (value.trim() !== "" && isNaN(processedValue as number))
            return zone;
        }
        return { ...zone, [field]: processedValue };
      }
      return zone;
    });
    onConfigChange({ ...config, goal: { ...currentGoal, zones: newZones } });
  };

  const handleAddZone = () => {
    if (!currentGoal) return; // Or create a default goal first
    const newZone: MetricZone = {
      id: crypto.randomUUID(),
      label: "New Zone",
      color: DEFAULT_ZONE_COLORS.good,
    };
    onConfigChange({
      ...config,
      goal: { ...currentGoal, zones: [...currentGoal.zones, newZone] },
    });
  };

  const handleRemoveZone = (zoneId: string) => {
    if (!currentGoal) return;
    onConfigChange({
      ...config,
      goal: {
        ...currentGoal,
        zones: currentGoal.zones.filter((z) => z.id !== zoneId),
      },
    });
  };

  // Template Handlers (operate on config.goal.logTemplates)
  const handleNewTemplateFieldChange = (
    field: keyof NewTemplateState,
    value: string,
  ) => {
    setNewTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTemplate = () => {
    if (!currentGoal) return; // Or create default goal
    if (!newTemplateForm.name.trim()) {
      alert("Template Name is required.");
      return;
    }
    if (newTemplateForm.value.trim() === "") {
      alert("Template Value is required.");
      return;
    }
    const templateVal = parseFloat(newTemplateForm.value);
    if (isNaN(templateVal)) {
      alert("Template Value must be a number.");
      return;
    }

    const newTemplate: MetricLogTemplate = {
      id: crypto.randomUUID(),
      name: newTemplateForm.name.trim(),
      value: templateVal,
      description: newTemplateForm.description.trim() || undefined,
    };
    onConfigChange({
      ...config,
      goal: {
        ...currentGoal,
        logTemplates: [...(currentGoal.logTemplates || []), newTemplate],
      },
    });
    setNewTemplateForm(initialNewTemplateState);
  };

  const handleRemoveTemplate = (templateId: string) => {
    if (!currentGoal) return;
    onConfigChange({
      ...config,
      goal: {
        ...currentGoal,
        logTemplates: (currentGoal.logTemplates || []).filter(
          (t) => t.id !== templateId,
        ),
      },
    });
  };

  const handleTemplateDetailChange = (
    templateId: string,
    field: keyof MetricLogTemplate,
    value: string,
  ) => {
    if (!currentGoal) return;
    onConfigChange({
      ...config,
      goal: {
        ...currentGoal,
        logTemplates: (currentGoal.logTemplates || []).map((template) => {
          if (template.id === templateId) {
            let processedValue: string | number | undefined = value;
            if (field === "value") {
              processedValue = parseFloat(value);
              if (isNaN(processedValue as number)) return template;
            }
            return { ...template, [field]: processedValue };
          }
          return template;
        }),
      },
    });
  };

  // --- Chart Config Handlers ---
  const handleAddChart = () => {
    const newChart: ChartConfig = {
      id: crypto.randomUUID(),
      title: `Chart ${(config.charts || []).length + 1}`,
      renderType: "raw_values", // Default to raw values
    };
    onConfigChange({ ...config, charts: [...(config.charts || []), newChart] });
  };

  const handleRemoveChart = (chartId: string) => {
    onConfigChange({
      ...config,
      charts: (config.charts || []).filter((c) => c.id !== chartId),
    });
  };

  const handleChartConfigChange = (
    chartId: string,
    field: keyof ChartConfig,
    value: any,
  ) => {
    const newCharts = (config.charts || []).map((chart) => {
      if (chart.id === chartId) {
        const updatedChart = { ...chart, [field]: value };
        // If renderType changes, reset specific fields for other types
        if (field === "renderType") {
          if (value !== "aggregated_sum") {
            delete updatedChart.aggregationTimePeriod;
            delete updatedChart.aggregationCustomSeconds;
          } else {
            // Set defaults for newly selected aggregated_sum
            updatedChart.aggregationTimePeriod =
              updatedChart.aggregationTimePeriod || "daily";
          }
          if (value !== "moving_average") {
            delete updatedChart.movingAverageTimePeriod;
            delete updatedChart.movingAverageCustomSeconds;
          } else {
            // Set defaults for newly selected moving_average
            updatedChart.movingAverageTimePeriod =
              updatedChart.movingAverageTimePeriod || "daily";
          }
        }
        // Ensure custom seconds is present if period is custom
        if (
          field === "aggregationTimePeriod" &&
          value === "custom" &&
          updatedChart.aggregationCustomSeconds === undefined
        ) {
          updatedChart.aggregationCustomSeconds = 86400; // Default 1 day
        }
        if (
          field === "movingAverageTimePeriod" &&
          value === "custom" &&
          updatedChart.movingAverageCustomSeconds === undefined
        ) {
          updatedChart.movingAverageCustomSeconds = 86400 * 7; // Default 7 days
        }
        return updatedChart;
      }
      return chart;
    });
    onConfigChange({ ...config, charts: newCharts });
  };

  // --- Initial Goal Setup ---
  const handleSetupInitialGoal = () => {
    const defaultGoal = {
      id: widgetId || crypto.randomUUID(), // Use widgetId as a stable ID for the goal if possible
      name: "My Metric",
      unit: "units",
      currentValue: 0,
      log: [],
      zones: createDefaultMetricZones("units"),
      logTemplates: createDefaultLogTemplatesForGoal("units"),
      creationTimestamp: new Date().toISOString(),
      description: "Tracking My Metric",
    };
    const defaultCharts = createDefaultChartsForGoal("units");
    onConfigChange({
      ...config, // Keep widgetTitle
      goal: defaultGoal,
      charts: defaultCharts,
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px",
    boxSizing: "border-box",
    borderRadius: "4px",
    border: "1px solid #ccc",
    width: "100%",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    border: "1px solid transparent",
  };
  const sectionStyle: React.CSSProperties = {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  };
  const subSectionStyle: React.CSSProperties = {
    marginTop: "15px",
    paddingTop: "10px",
    borderTop: "1px dashed #eee",
  };
  const gridInputStyle: React.CSSProperties = { ...inputStyle, width: "auto" }; // For grid items

  if (!currentGoal) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>This widget needs a metric goal to be configured.</p>
        <button
          onClick={handleSetupInitialGoal}
          style={{ ...buttonStyle, background: "#4CAF50", color: "white" }}
        >
          Setup Metric Goal
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor={`${widgetId}-widgetTitle`}>Widget Title:</label>
        <input
          id={`${widgetId}-widgetTitle`}
          type="text"
          value={config.widgetTitle}
          onChange={handleTitleChange}
          style={inputStyle}
        />
      </div>

      {/* --- Goal Configuration Section --- */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0, marginBottom: "15px" }}>
          Metric Goal Configuration
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 15px",
            marginBottom: "10px",
          }}
        >
          <div>
            <label htmlFor={`${widgetId}-goalName`}>Goal Name:</label>
            <input
              id={`${widgetId}-goalName`}
              type="text"
              placeholder="Goal Name"
              value={currentGoal.name}
              onChange={(e) => handleGoalDetailChange("name", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor={`${widgetId}-goalUnit`}>Unit:</label>
            <input
              id={`${widgetId}-goalUnit`}
              type="text"
              placeholder="Unit"
              value={currentGoal.unit}
              onChange={(e) => handleGoalDetailChange("unit", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${widgetId}-goalDesc`}>
            Description (optional):
          </label>
          <textarea
            id={`${widgetId}-goalDesc`}
            placeholder="Description"
            value={currentGoal.description || ""}
            onChange={(e) =>
              handleGoalDetailChange("description", e.target.value)
            }
            rows={2}
            style={{ ...inputStyle, resize: "vertical", marginBottom: "10px" }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 15px",
            marginBottom: "15px",
          }}
        >
          <div>
            <label htmlFor={`${widgetId}-goalDisplayMin`}>
              Global Chart Y-Min (optional):
            </label>
            <input
              id={`${widgetId}-goalDisplayMin`}
              type="number"
              placeholder="e.g., 0"
              title="Global Y-axis minimum hint"
              value={currentGoal.displayMin ?? ""}
              onChange={(e) =>
                handleGoalDetailChange("displayMin", e.target.value)
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor={`${widgetId}-goalDisplayMax`}>
              Global Chart Y-Max (optional):
            </label>
            <input
              id={`${widgetId}-goalDisplayMax`}
              type="number"
              placeholder="e.g., 100"
              title="Global Y-axis maximum hint"
              value={currentGoal.displayMax ?? ""}
              onChange={(e) =>
                handleGoalDetailChange("displayMax", e.target.value)
              }
              style={inputStyle}
            />
          </div>
        </div>

        {/* Zones Configuration (largely same JSX structure as before) */}
        <div style={subSectionStyle}>
          <h5 style={{ fontSize: "1em", marginTop: 0, marginBottom: "5px" }}>
            Define Zones:
          </h5>
          {currentGoal.zones.map((zone) => (
            <div
              key={zone.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 50px 2fr auto",
                gap: "8px",
                alignItems: "center",
                marginBottom: "8px",
                padding: "8px",
                background: "#f9f9f9",
                borderRadius: "4px",
              }}
            >
              <input
                type="number"
                placeholder="Lower"
                title="Lower Bound"
                value={zone.lowerBound ?? ""}
                onChange={(e) =>
                  handleZoneChange(zone.id, "lowerBound", e.target.value)
                }
                style={gridInputStyle}
              />
              <input
                type="number"
                placeholder="Upper"
                title="Upper Bound"
                value={zone.upperBound ?? ""}
                onChange={(e) =>
                  handleZoneChange(zone.id, "upperBound", e.target.value)
                }
                style={gridInputStyle}
              />
              <input
                type="color"
                aria-label="Zone color"
                value={zone.color}
                onChange={(e) =>
                  handleZoneChange(zone.id, "color", e.target.value)
                }
                style={{
                  padding: 0,
                  border: 0,
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  justifySelf: "center",
                }}
              />
              <input
                type="text"
                placeholder="Label"
                title="Zone Label"
                value={zone.label}
                onChange={(e) =>
                  handleZoneChange(zone.id, "label", e.target.value)
                }
                style={gridInputStyle}
              />
              <button
                onClick={() => handleRemoveZone(zone.id)}
                style={{
                  ...buttonStyle,
                  background: "#ff9800",
                  color: "white",
                  padding: "4px 8px",
                  fontSize: "0.8em",
                }}
                title="Remove Zone"
                aria-label="Remove Zone"
              >
                {" "}
                ✕{" "}
              </button>
            </div>
          ))}
          <button
            onClick={handleAddZone}
            style={{
              ...buttonStyle,
              fontSize: "0.9em",
              padding: "6px 12px",
              background: "#e0e0e0",
              color: "#333",
              border: "1px solid #ccc",
              marginTop: "5px",
            }}
          >
            {" "}
            + Add Zone{" "}
          </button>
        </div>

        {/* Log Templates Configuration (largely same JSX structure as before) */}
        <div style={subSectionStyle}>
          <h5 style={{ fontSize: "1em", marginTop: 0, marginBottom: "10px" }}>
            Manage Log Templates:
          </h5>
          {(currentGoal.logTemplates || []).map((template) => (
            <div
              key={template.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr auto",
                gap: "8px",
                alignItems: "center",
                marginBottom: "8px",
                padding: "8px",
                background: "#f9f9f9",
                borderRadius: "4px",
              }}
            >
              <input
                type="text"
                placeholder="Name"
                title="Template Name"
                value={template.name}
                onChange={(e) =>
                  handleTemplateDetailChange(
                    template.id,
                    "name",
                    e.target.value,
                  )
                }
                style={gridInputStyle}
              />
              <input
                type="number"
                placeholder="Value"
                title="Value (positive to add, negative to subtract)"
                value={template.value}
                onChange={(e) =>
                  handleTemplateDetailChange(
                    template.id,
                    "value",
                    e.target.value,
                  )
                }
                style={gridInputStyle}
              />
              <input
                type="text"
                placeholder="Desc (opt.)"
                title="Description (optional)"
                value={template.description || ""}
                onChange={(e) =>
                  handleTemplateDetailChange(
                    template.id,
                    "description",
                    e.target.value,
                  )
                }
                style={gridInputStyle}
              />
              <button
                onClick={() => handleRemoveTemplate(template.id)}
                style={{
                  ...buttonStyle,
                  background: "#ff9800",
                  color: "white",
                  padding: "4px 8px",
                  fontSize: "0.8em",
                }}
                title="Remove Template"
                aria-label="Remove Template"
              >
                {" "}
                ✕{" "}
              </button>
            </div>
          ))}
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px dashed #ccc",
              borderRadius: "4px",
            }}
          >
            <h6 style={{ marginTop: 0, marginBottom: "5px" }}>
              Add New Template:
            </h6>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <input
                type="text"
                placeholder="Template Name (e.g., Cleared 50 Emails)"
                value={newTemplateForm.name}
                onChange={(e) =>
                  handleNewTemplateFieldChange("name", e.target.value)
                }
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Value (e.g., -50)"
                title="Numeric value. Negative for decreases."
                value={newTemplateForm.value}
                onChange={(e) =>
                  handleNewTemplateFieldChange("value", e.target.value)
                }
                style={inputStyle}
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              value={newTemplateForm.description}
              onChange={(e) =>
                handleNewTemplateFieldChange("description", e.target.value)
              }
              rows={2}
              style={{ ...inputStyle, marginBottom: "8px", resize: "vertical" }}
            />
            <button
              onClick={handleAddTemplate}
              style={{
                ...buttonStyle,
                background: "#607d8b",
                color: "white",
                fontSize: "0.9em",
              }}
            >
              {" "}
              + Add Template{" "}
            </button>
          </div>
        </div>
      </div>

      {/* --- Chart Configuration Section --- */}
      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 0 }}>
            Chart Views Configuration
          </h4>
          <button
            onClick={handleAddChart}
            style={{ ...buttonStyle, background: "#009688", color: "white" }}
          >
            + Add Chart View
          </button>
        </div>
        {(config.charts || []).map((chartConf) => (
          <div
            key={chartConf.id}
            style={{
              padding: "10px",
              border: "1px solid #eee",
              borderRadius: "6px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <input
                type="text"
                placeholder="Chart Title"
                value={chartConf.title}
                onChange={(e) =>
                  handleChartConfigChange(chartConf.id, "title", e.target.value)
                }
                style={gridInputStyle}
              />
              <select
                value={chartConf.renderType}
                onChange={(e) =>
                  handleChartConfigChange(
                    chartConf.id,
                    "renderType",
                    e.target.value as ChartRenderType,
                  )
                }
                style={gridInputStyle}
              >
                <option value="raw_values">Raw Logged Values</option>
                <option value="aggregated_sum">Aggregated Sum</option>
                <option value="moving_average">Moving Average</option>
              </select>
              <button
                onClick={() => handleRemoveChart(chartConf.id)}
                style={{
                  ...buttonStyle,
                  background: "#e91e63",
                  color: "white",
                  padding: "6px 10px",
                  fontSize: "0.9em",
                }}
                title="Remove Chart View"
                aria-label="Remove Chart View"
              >
                ✕
              </button>
            </div>

            {/* Y-Axis overrides for this chart */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label
                  style={{ fontSize: "0.8em" }}
                  htmlFor={`${widgetId}-chart-${chartConf.id}-minY`}
                >
                  Chart Y-Min (override):
                </label>
                <input
                  id={`${widgetId}-chart-${chartConf.id}-minY`}
                  type="number"
                  placeholder="Min Y (opt.)"
                  value={chartConf.yAxisDisplayMin ?? ""}
                  onChange={(e) =>
                    handleChartConfigChange(
                      chartConf.id,
                      "yAxisDisplayMin",
                      e.target.value === ""
                        ? undefined
                        : parseFloat(e.target.value),
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: "0.8em" }}
                  htmlFor={`${widgetId}-chart-${chartConf.id}-maxY`}
                >
                  Chart Y-Max (override):
                </label>
                <input
                  id={`${widgetId}-chart-${chartConf.id}-maxY`}
                  type="number"
                  placeholder="Max Y (opt.)"
                  value={chartConf.yAxisDisplayMax ?? ""}
                  onChange={(e) =>
                    handleChartConfigChange(
                      chartConf.id,
                      "yAxisDisplayMax",
                      e.target.value === ""
                        ? undefined
                        : parseFloat(e.target.value),
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {chartConf.renderType === "aggregated_sum" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <select
                  value={chartConf.aggregationTimePeriod || "daily"}
                  onChange={(e) =>
                    handleChartConfigChange(
                      chartConf.id,
                      "aggregationTimePeriod",
                      e.target.value as TimePeriod,
                    )
                  }
                  style={gridInputStyle}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (seconds)</option>
                </select>
                {chartConf.aggregationTimePeriod === "custom" && (
                  <input
                    type="number"
                    placeholder="Seconds"
                    title="Aggregation period in seconds"
                    value={chartConf.aggregationCustomSeconds || ""}
                    onChange={(e) =>
                      handleChartConfigChange(
                        chartConf.id,
                        "aggregationCustomSeconds",
                        parseInt(e.target.value),
                      )
                    }
                    style={gridInputStyle}
                  />
                )}
              </div>
            )}
            {chartConf.renderType === "moving_average" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <select
                  value={chartConf.movingAverageTimePeriod || "daily"}
                  onChange={(e) =>
                    handleChartConfigChange(
                      chartConf.id,
                      "movingAverageTimePeriod",
                      e.target.value as TimePeriod,
                    )
                  }
                  style={gridInputStyle}
                >
                  <option value="hourly">Hourly (Window)</option>
                  <option value="daily">Daily (Window)</option>
                  <option value="weekly">Weekly (Window)</option>
                  <option value="monthly">Monthly (Window)</option>
                  <option value="custom">Custom (seconds window)</option>
                </select>
                {chartConf.movingAverageTimePeriod === "custom" && (
                  <input
                    type="number"
                    placeholder="Seconds"
                    title="Moving average window in seconds"
                    value={chartConf.movingAverageCustomSeconds || ""}
                    onChange={(e) =>
                      handleChartConfigChange(
                        chartConf.id,
                        "movingAverageCustomSeconds",
                        parseInt(e.target.value),
                      )
                    }
                    style={gridInputStyle}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        {(!config.charts || config.charts.length === 0) && (
          <p style={{ textAlign: "center", color: "#777" }}>
            No chart views configured. Add one to see your data.
          </p>
        )}
      </div>
    </div>
  );
};
