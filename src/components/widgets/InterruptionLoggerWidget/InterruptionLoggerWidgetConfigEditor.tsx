import React from "react";
import { InterruptionLoggerConfig } from "./InterruptionLoggerWidget";
import { WidgetConfigComponentProps } from "../../widgets/registry";

export const InterruptionLoggerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<InterruptionLoggerConfig>
> = ({ config, onConfigChange }) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, name: e.target.value });
  };

  const handleMaxRecentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      onConfigChange({ ...config, maxRecentCauses: val });
    }
  };

  const clearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all interruption history? This cannot be undone.",
      )
    ) {
      onConfigChange({
        ...config,
        interruptions: [],
        recentCauses: [], // Optionally clear recent causes too
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label
          htmlFor="interruptionLoggerName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Name:
        </label>
        <input
          type="text"
          id="interruptionLoggerName"
          name="name"
          value={config.name}
          onChange={handleNameChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <label
          htmlFor="maxRecentCauses"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Max Recent Causes to Store for Autocomplete:
        </label>
        <input
          type="number"
          id="maxRecentCauses"
          name="maxRecentCauses"
          value={config.maxRecentCauses}
          min="1"
          max="100"
          onChange={handleMaxRecentChange}
          style={{ width: "100px", padding: "8px", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <h4 style={{ marginTop: "10px", marginBottom: "5px" }}>Manage Data</h4>
        <button
          onClick={clearHistory}
          style={{
            padding: "8px 12px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear All Interruption History
        </button>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "10px" }}>
        Log interruptions quickly to understand your focus patterns.
      </p>
    </div>
  );
};
