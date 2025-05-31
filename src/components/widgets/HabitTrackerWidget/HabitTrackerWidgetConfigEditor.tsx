import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { HabitTrackerConfig, HabitAction } from "./types";

export const HabitTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<HabitTrackerConfig>
> = ({ config, onConfigChange }) => {
  const [newActionName, setNewActionName] = useState("");
  const [newActionEmoji, setNewActionEmoji] = useState("");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  const handleAddAction = () => {
    if (!newActionName.trim()) return;
    const newAction: HabitAction = {
      id: crypto.randomUUID(),
      name: newActionName.trim(),
      emoji: newActionEmoji.trim() || undefined,
    };
    onConfigChange({
      ...config,
      actions: [...config.actions, newAction],
    });
    setNewActionName("");
    setNewActionEmoji("");
  };

  const handleRemoveAction = (actionId: string) => {
    // Optional: decide if logs for this action should be cleared or kept.
    // For MVI, we'll keep logs, they just won't be displayed if action is removed.
    onConfigChange({
      ...config,
      actions: config.actions.filter((action) => action.id !== actionId),
    });
  };

  const handleActionDetailChange = (
    actionId: string,
    field: keyof HabitAction,
    value: string,
  ) => {
    onConfigChange({
      ...config,
      actions: config.actions.map((action) =>
        action.id === actionId
          ? {
              ...action,
              [field]: value.trim() || (field === "emoji" ? undefined : ""),
            }
          : action,
      ),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "5px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label
          htmlFor="habitWidgetTitle"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Title:
        </label>
        <input
          type="text"
          id="habitWidgetTitle"
          name="widgetTitle"
          value={config.widgetTitle}
          onChange={handleTitleChange}
          style={inputStyle}
        />
      </div>

      <div>
        <h4 style={{ marginTop: 0, marginBottom: "10px" }}>Manage Habits:</h4>
        {config.actions.map((action) => (
          <div
            key={action.id}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "10px",
              padding: "5px",
              border: "1px solid #eee",
              borderRadius: "4px",
            }}
          >
            <input
              type="text"
              placeholder="Emoji (e.g., 🛏️)"
              value={action.emoji || ""}
              onChange={(e) =>
                handleActionDetailChange(action.id, "emoji", e.target.value)
              }
              style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
            />
            <input
              type="text"
              placeholder="Action Name"
              value={action.name}
              onChange={(e) =>
                handleActionDetailChange(action.id, "name", e.target.value)
              }
              style={{ ...inputStyle, flexGrow: 1, marginBottom: 0 }}
            />
            <button
              onClick={() => handleRemoveAction(action.id)}
              style={{
                ...buttonStyle,
                background: "#f44336",
                color: "white",
                border: "none",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            border: "1px dashed #ccc",
            borderRadius: "4px",
          }}
        >
          <h5 style={{ marginTop: 0, marginBottom: "10px" }}>Add New Habit:</h5>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Emoji (optional)"
              value={newActionEmoji}
              onChange={(e) => setNewActionEmoji(e.target.value)}
              style={{ ...inputStyle, width: "100px", marginBottom: 0 }}
            />
            <input
              type="text"
              placeholder="Action Name (e.g., Drink Water)"
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
              style={{ ...inputStyle, flexGrow: 1, marginBottom: 0 }}
            />
            <button
              onClick={handleAddAction}
              style={{
                ...buttonStyle,
                background: "#4CAF50",
                color: "white",
                border: "none",
              }}
            >
              Add Habit
            </button>
          </div>
        </div>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "15px" }}>
        Note: Changes are applied when you save the widget configuration.
      </p>
    </div>
  );
};
