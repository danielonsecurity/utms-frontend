import React from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { SleepTrackerConfig } from "./types";

export const SleepTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<SleepTrackerConfig>
> = ({ config, onConfigChange }) => {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  const handleDisplayDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let days = parseInt(e.target.value, 10);
    if (isNaN(days) || days < 3) days = 3; // Min 3 days for timeline
    if (days > 30) days = 30; // Max 30 days
    onConfigChange({ ...config, displayDaysInTimeline: days });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "10px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div>
        <label
          htmlFor="sleepWidgetTitle"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Title:
        </label>
        <input
          type="text"
          id="sleepWidgetTitle"
          name="widgetTitle"
          value={config.widgetTitle}
          onChange={handleTitleChange}
          style={inputStyle}
        />
      </div>
      <div>
        <label
          htmlFor="sleepDisplayDays"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Days in Timeline Summary:
        </label>
        <input
          type="number"
          id="sleepDisplayDays"
          name="displayDaysInTimeline"
          value={config.displayDaysInTimeline}
          onChange={handleDisplayDaysChange}
          min="3"
          max="30"
          style={inputStyle}
        />
      </div>
    </div>
  );
};
