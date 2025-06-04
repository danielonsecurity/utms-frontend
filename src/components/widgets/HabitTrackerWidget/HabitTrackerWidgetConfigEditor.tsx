import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { HabitTrackerConfig, HabitAction } from "./types";

export const HabitTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<HabitTrackerConfig>
> = ({ config, onConfigChange }) => {
  const [newActionName, setNewActionName] = useState("");
  const [newActionEmoji, setNewActionEmoji] = useState("");
  const [newActionMaxSkipDays, setNewActionMaxSkipDays] = useState("0"); // Added state for maxSkipDays
  const [newActionIsNegative, setNewActionIsNegative] = useState(false); // Added

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  const handleAddAction = () => {
    if (!newActionName.trim()) return;
    const maxSkip = parseInt(newActionMaxSkipDays, 10);
    const newAction: HabitAction = {
      id: crypto.randomUUID(),
      name: newActionName.trim(),
      emoji: newActionEmoji.trim() || undefined,
      isNegative: newActionIsNegative, // Set isNegative
      // Only set maxSkipDays if it's not a negative habit
      maxSkipDays: !newActionIsNegative && maxSkip >= 0 ? maxSkip : undefined,
    };
    onConfigChange({
      ...config,
      actions: [...config.actions, newAction],
    });
    setNewActionName("");
    setNewActionEmoji("");
    setNewActionMaxSkipDays("0");
    setNewActionIsNegative(false); // Reset
  };

  const handleActionDetailChange = (
    actionId: string,
    field: keyof HabitAction | "isNegativeToggle", // Special case for checkbox
    value: string | boolean, // Value can be boolean for checkbox
  ) => {
    onConfigChange({
      ...config,
      actions: config.actions.map((action) => {
        if (action.id !== actionId) return action;

        let processedValue: any;
        if (field === "maxSkipDays") {
          const numValue = parseInt(value as string, 10);
          processedValue = numValue >= 0 ? numValue : (action.maxSkipDays ?? 0);
        } else if (field === "emoji") {
          processedValue = (value as string).trim() || undefined;
        } else if (field === "name") {
          processedValue = (value as string).trim();
        } else if (field === "isNegativeToggle") {
          // Handle checkbox
          processedValue = value as boolean;
          // If changing to negative, clear maxSkipDays. If changing to positive, default maxSkipDays.
          return {
            ...action,
            isNegative: processedValue,
            maxSkipDays: processedValue ? undefined : (action.maxSkipDays ?? 0),
          };
        } else {
          processedValue = value;
        }

        return { ...action, [field as keyof HabitAction]: processedValue };
      }),
    });
  };

  const handleRemoveAction = (actionId: string) => {
    onConfigChange({
      ...config,
      actions: config.actions.filter((action) => action.id !== actionId),
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
              padding: "10px", // Increased padding a bit for better spacing
              border: "1px solid #eee",
              borderRadius: "4px",
              borderLeft: action.isNegative
                ? "3px solid #f44336"
                : "3px solid #4CAF50",
              // paddingLeft: "10px", // Already handled by overall padding
            }}
          >
            {/* --- MISSING PARTS RE-ADDED FOR EXISTING HABITS --- */}
            <input
              type="text"
              placeholder="Emoji"
              value={action.emoji || ""}
              onChange={(e) =>
                handleActionDetailChange(action.id, "emoji", e.target.value)
              }
              style={{ ...inputStyle, width: "60px", marginBottom: 0 }}
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
            {/* --- END OF MISSING PARTS --- */}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "5px",
                minWidth: "150px",
              }}
            >
              {" "}
              {/* Wrapper for checkbox and skip days */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id={`isNegative-${action.id}`}
                  checked={!!action.isNegative}
                  onChange={(e) =>
                    handleActionDetailChange(
                      action.id,
                      "isNegativeToggle",
                      e.target.checked,
                    )
                  }
                  style={{ marginRight: "5px", transform: "scale(0.9)" }}
                />
                <label
                  htmlFor={`isNegative-${action.id}`}
                  style={{ fontSize: "0.85em", cursor: "pointer" }}
                >
                  To Avoid?
                </label>
              </div>
              {!action.isNegative && (
                <input
                  type="number"
                  min="0"
                  title={`Max days to skip (current: ${action.maxSkipDays ?? 0}). 0 for daily.`}
                  value={action.maxSkipDays ?? 0}
                  onChange={(e) =>
                    handleActionDetailChange(
                      action.id,
                      "maxSkipDays",
                      e.target.value,
                    )
                  }
                  style={{
                    ...inputStyle,
                    width: "80px",
                    padding: "4px", // smaller padding
                    fontSize: "0.85em",
                    textAlign: "center",
                    marginBottom: 0,
                  }}
                />
              )}
            </div>

            {/* --- MISSING REMOVE BUTTON RE-ADDED --- */}
            <button
              onClick={() => handleRemoveAction(action.id)}
              style={{
                ...buttonStyle,
                background: "#f44336",
                color: "white",
                border: "none",
                padding: "6px 10px", // Adjusted padding
                fontSize: "0.9em",
              }}
            >
              Remove
            </button>
            {/* --- END OF MISSING PART --- */}
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
          {/* --- MISSING PARTS RE-ADDED FOR ADDING NEW HABIT --- */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
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
          </div>
          {/* --- END OF MISSING PARTS --- */}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "10px", // Added margin
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                id="newActionIsNegative"
                checked={newActionIsNegative}
                onChange={(e) => setNewActionIsNegative(e.target.checked)}
                style={{ marginRight: "5px" }}
              />
              <label
                htmlFor="newActionIsNegative"
                style={{ fontSize: "0.9em", cursor: "pointer" }}
              >
                Is this a habit to AVOID?
              </label>
            </div>

            {!newActionIsNegative && (
              <input
                type="number"
                min="0"
                placeholder="Skip Days (0=daily)"
                title="Max days to skip (0 for daily)."
                value={newActionMaxSkipDays}
                onChange={(e) => setNewActionMaxSkipDays(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "120px",
                  textAlign: "center",
                  marginBottom: 0,
                }}
              />
            )}
          </div>
          {/* --- MISSING ADD BUTTON RE-ADDED --- */}
          <button
            onClick={handleAddAction}
            style={{
              ...buttonStyle,
              background: "#4CAF50",
              color: "white",
              border: "none",
              width: "100%", // Make button full width for this section
              padding: "10px",
            }}
          >
            Add Habit
          </button>
          {/* --- END OF MISSING PART --- */}
        </div>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "15px" }}>
        Note: Changes are applied when you save the widget configuration.
      </p>
    </div>
  );
};
