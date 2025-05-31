import React from "react";
import { TimerConfig } from "./TimerWidget";
import { WidgetConfigComponentProps } from "../../../widgets/registry";

export const TimerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<TimerConfig>
> = ({ config, onConfigChange }) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "number") {
      processedValue = parseInt(value, 10);
      if (isNaN(processedValue as number)) processedValue = 0;
    } else if (type === "checkbox") {
      processedValue = (e.target as HTMLInputElement).checked;
    }

    onConfigChange({ ...config, [name]: processedValue });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div>
        <label
          htmlFor="timerName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Name:
        </label>
        <input
          type="text"
          id="timerName"
          name="name"
          value={config.name}
          onChange={handleChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <label
          htmlFor="timerDuration"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Duration (seconds):
        </label>
        <input
          type="number"
          id="timerDuration"
          name="duration"
          value={config.duration}
          onChange={handleChange}
          min="1"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          id="timerAutoStart"
          name="autoStart"
          checked={config.autoStart}
          onChange={handleChange}
        />
        <label htmlFor="timerAutoStart">Auto Start</label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          id="timerSoundEnabled"
          name="soundEnabled"
          checked={config.soundEnabled}
          onChange={handleChange}
        />
        <label htmlFor="timerSoundEnabled">Enable Sound</label>
      </div>
      {/* Add more config options as needed */}
      <p style={{ fontSize: "0.8em", color: "#555" }}>
        Note: Changes are applied immediately. Close the modal to save.
      </p>
    </div>
  );
};
