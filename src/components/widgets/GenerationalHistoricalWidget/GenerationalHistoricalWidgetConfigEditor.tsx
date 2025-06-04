import React from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { GenerationalHistoricalWidgetConfig } from "./types"; // Import from types.ts

export const GenerationalHistoricalWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<GenerationalHistoricalWidgetConfig>
> = ({ config, onConfigChange }) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "checkbox") {
      processedValue = (e.target as HTMLInputElement).checked;
    }
    onConfigChange({ ...config, [name]: processedValue });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div>
        <label
          htmlFor="ghwName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Name:
        </label>
        <input
          type="text"
          id="ghwName"
          name="name"
          value={config.name}
          onChange={handleChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          id="ghwShowHistoricalPeriods"
          name="showHistoricalPeriods"
          checked={config.showHistoricalPeriods}
          onChange={handleChange}
        />
        <label htmlFor="ghwShowHistoricalPeriods">
          Show Historical Periods
        </label>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555" }}>
        Timeline view (dates, zoom) is controlled by interacting with the widget
        itself.
      </p>
    </div>
  );
};
