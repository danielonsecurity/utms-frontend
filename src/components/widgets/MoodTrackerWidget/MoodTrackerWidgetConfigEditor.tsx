import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path as needed
import { MoodTrackerConfig, Mood } from "./types";

export const MoodTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<MoodTrackerConfig>
> = ({ config, onConfigChange }) => {
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodEmoji, setNewMoodEmoji] = useState("");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  const handleAddMood = () => {
    if (!newMoodName.trim()) return;
    const newMood: Mood = {
      id: crypto.randomUUID(),
      name: newMoodName.trim(),
      emoji: newMoodEmoji.trim() || undefined,
    };
    onConfigChange({
      ...config,
      moods: [...config.moods, newMood],
    });
    setNewMoodName("");
    setNewMoodEmoji("");
  };

  const handleRemoveMood = (moodId: string) => {
    // Optional: Decide if logs for this mood type should be handled.
    // For now, logs will remain but might not be displayable if mood type is removed.
    // A more robust solution might involve archiving or warning the user.
    onConfigChange({
      ...config,
      moods: config.moods.filter((mood) => mood.id !== moodId),
    });
  };

  const handleMoodDetailChange = (
    moodId: string,
    field: keyof Mood,
    value: string,
  ) => {
    onConfigChange({
      ...config,
      moods: config.moods.map((mood) =>
        mood.id === moodId
          ? {
              ...mood,
              [field]: value.trim() || (field === "emoji" ? undefined : ""),
            }
          : mood,
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
          htmlFor="moodWidgetTitle"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Title:
        </label>
        <input
          type="text"
          id="moodWidgetTitle"
          name="widgetTitle"
          value={config.widgetTitle}
          onChange={handleTitleChange}
          style={inputStyle}
        />
      </div>

      <div>
        <h4 style={{ marginTop: 0, marginBottom: "10px" }}>Manage Moods:</h4>
        {config.moods.map((mood) => (
          <div
            key={mood.id}
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
              placeholder="Emoji (e.g., 😊)"
              value={mood.emoji || ""}
              onChange={(e) =>
                handleMoodDetailChange(mood.id, "emoji", e.target.value)
              }
              style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
            />
            <input
              type="text"
              placeholder="Mood Name"
              value={mood.name}
              onChange={(e) =>
                handleMoodDetailChange(mood.id, "name", e.target.value)
              }
              style={{ ...inputStyle, flexGrow: 1, marginBottom: 0 }}
            />
            <button
              onClick={() => handleRemoveMood(mood.id)}
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
          <h5 style={{ marginTop: 0, marginBottom: "10px" }}>Add New Mood:</h5>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Emoji (optional)"
              value={newMoodEmoji}
              onChange={(e) => setNewMoodEmoji(e.target.value)}
              style={{ ...inputStyle, width: "100px", marginBottom: 0 }}
            />
            <input
              type="text"
              placeholder="Mood Name (e.g., Happy)"
              value={newMoodName}
              onChange={(e) => setNewMoodName(e.target.value)}
              style={{ ...inputStyle, flexGrow: 1, marginBottom: 0 }}
            />
            <button
              onClick={handleAddMood}
              style={{
                ...buttonStyle,
                background: "#4CAF50",
                color: "white",
                border: "none",
              }}
            >
              Add Mood
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
