import React from "react";
import { ContextSwitcherConfig } from "./ContextSwitcherWidget";
import { WidgetConfigComponentProps } from "../../widgets/registry";

export const ContextSwitcherWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<ContextSwitcherConfig>
> = ({ config, onConfigChange }) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    onConfigChange({ ...config, [name]: value });
  };

  const clearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all context history? This cannot be undone.",
      )
    ) {
      onConfigChange({
        ...config,
        contexts: [],
        contextColors: {}, // Reset assigned colors as well
        nextColorIndex: 0,
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label
          htmlFor="contextSwitcherName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Name:
        </label>
        <input
          type="text"
          id="contextSwitcherName"
          name="name"
          value={config.name}
          onChange={handleChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
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
          Clear All Context History
        </button>
        <p style={{ fontSize: "0.8em", color: "#666", marginTop: "5px" }}>
          Warning: This will remove all recorded context switches.
        </p>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "10px" }}>
        Track your focus by logging what context you are switching to. The
        timeline will visualize your day.
      </p>
    </div>
  );
};
