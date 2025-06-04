// entropyBurdenTracker/EntropyBurdenTrackerWidgetConfigEditor.tsx
import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path
import {
  EntropyBurdenTrackerConfig,
  EntropyBurden,
  EnergyLevel,
  EmotionalLoadEmoji,
  ImportanceLevel,
  DecayRate,
} from "./types";

// Options for selects - could be moved to a constants file
const ENERGY_LEVELS: EnergyLevel[] = ["Low", "Medium", "High", "Very High"];
const EMOTIONAL_LOAD_EMOJIS: EmotionalLoadEmoji[] = [
  "😊",
  "🙂",
  "😐",
  "😟",
  "😩",
  "🤯",
];
const IMPORTANCE_LEVELS: ImportanceLevel[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];
const DECAY_RATES: DecayRate[] = ["Slow", "Steady", "Accelerating"];

export const EntropyBurdenTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<EntropyBurdenTrackerConfig>
> = ({ config, onConfigChange }) => {
  const [newBurdenName, setNewBurdenName] = useState("");
  // Add states for other new burden fields if you want to set them on creation
  // For simplicity, we'll add them with defaults and let user edit after creation

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, widgetTitle: e.target.value });
  };

  const handleAddBurden = () => {
    if (!newBurdenName.trim()) return;
    const newBurden: EntropyBurden = {
      id: crypto.randomUUID(),
      name: newBurdenName.trim(),
      currentEntropyLevel: 0.5, // Default starting entropy
      log: [],
      creationTimestamp: new Date().toISOString(),
      // Initialize other optional fields with defaults or undefined
      energyToEngage: "Medium",
      emotionalLoad: "😐",
      importance: "Medium",
      decayRate: "Steady",
      tags: [],
    };
    onConfigChange({
      ...config,
      burdens: [...config.burdens, newBurden],
    });
    setNewBurdenName("");
  };

  const handleRemoveBurden = (burdenId: string) => {
    onConfigChange({
      ...config,
      burdens: config.burdens.filter((b) => b.id !== burdenId),
    });
  };

  const handleBurdenDetailChange = <
    K extends keyof Omit<
      EntropyBurden,
      | "log"
      | "currentEntropyLevel"
      | "lastTouchedTimestamp"
      | "creationTimestamp"
    >,
  >(
    burdenId: string,
    field: K,
    value: EntropyBurden[K],
  ) => {
    onConfigChange({
      ...config,
      burdens: config.burdens.map((burden) =>
        burden.id === burdenId ? { ...burden, [field]: value } : burden,
      ),
    });
  };

  const handleTagChange = (burdenId: string, newTagsString: string) => {
    const newTags = newTagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    handleBurdenDetailChange(burdenId, "tags", newTags);
  };

  const inputStyle: React.CSSProperties = {
    /* ... */
  };
  const buttonStyle: React.CSSProperties = {
    /* ... */
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: "auto",
    minWidth: "100px",
    marginRight: "10px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label
          htmlFor="ebtWidgetTitle"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Title:
        </label>
        <input
          type="text"
          id="ebtWidgetTitle"
          value={config.widgetTitle}
          onChange={handleTitleChange}
          style={inputStyle}
        />
      </div>

      <div>
        <h4 style={{ marginTop: 0, marginBottom: "10px" }}>Manage Burdens:</h4>
        {config.burdens.map((burden) => (
          <div
            key={burden.id}
            style={{
              marginBottom: "15px",
              padding: "10px",
              border: "1px solid #eee",
              borderRadius: "4px",
            }}
          >
            <input
              type="text"
              placeholder="Burden Name"
              value={burden.name}
              onChange={(e) =>
                handleBurdenDetailChange(burden.id, "name", e.target.value)
              }
              style={{
                ...inputStyle,
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            />
            <textarea
              placeholder="Description (optional)"
              value={burden.description || ""}
              onChange={(e) =>
                handleBurdenDetailChange(
                  burden.id,
                  "description",
                  e.target.value,
                )
              }
              rows={2}
              style={{
                ...inputStyle,
                marginBottom: "10px",
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "10px",
                alignItems: "center",
              }}
            >
              <div>
                <label style={{ fontSize: "0.8em", display: "block" }}>
                  Energy to Engage:
                </label>
                <select
                  value={burden.energyToEngage || "Medium"}
                  style={selectStyle}
                  onChange={(e) =>
                    handleBurdenDetailChange(
                      burden.id,
                      "energyToEngage",
                      e.target.value as EnergyLevel,
                    )
                  }
                >
                  {ENERGY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8em", display: "block" }}>
                  Emotional Load:
                </label>
                <select
                  value={burden.emotionalLoad || "😐"}
                  style={selectStyle}
                  onChange={(e) =>
                    handleBurdenDetailChange(
                      burden.id,
                      "emotionalLoad",
                      e.target.value as EmotionalLoadEmoji,
                    )
                  }
                >
                  {EMOTIONAL_LOAD_EMOJIS.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8em", display: "block" }}>
                  Importance:
                </label>
                <select
                  value={burden.importance || "Medium"}
                  style={selectStyle}
                  onChange={(e) =>
                    handleBurdenDetailChange(
                      burden.id,
                      "importance",
                      e.target.value as ImportanceLevel,
                    )
                  }
                >
                  {IMPORTANCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8em", display: "block" }}>
                  Decay Rate:
                </label>
                <select
                  value={burden.decayRate || "Steady"}
                  style={selectStyle}
                  onChange={(e) =>
                    handleBurdenDetailChange(
                      burden.id,
                      "decayRate",
                      e.target.value as DecayRate,
                    )
                  }
                >
                  {DECAY_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.8em", display: "block" }}>
                Tags (comma-separated):
              </label>
              <input
                type="text"
                placeholder="e.g., home, digital, urgent"
                value={(burden.tags || []).join(", ")}
                onChange={(e) => handleTagChange(burden.id, e.target.value)}
                style={{ ...inputStyle, marginBottom: "10px" }}
              />
            </div>
            <button
              onClick={() => handleRemoveBurden(burden.id)}
              style={{
                ...buttonStyle,
                background: "#f44336",
                color: "white",
                border: "none",
              }}
            >
              Remove Burden
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
          <h5 style={{ marginTop: 0, marginBottom: "10px" }}>
            Add New Burden:
          </h5>
          <input
            type="text"
            placeholder="Name (e.g., Unfile Paperwork)"
            value={newBurdenName}
            onChange={(e) => setNewBurdenName(e.target.value)}
            style={{ ...inputStyle, marginBottom: "10px" }}
          />
          {/* Could add inputs for initial description, tags, etc. here */}
          <button
            onClick={handleAddBurden}
            style={{
              ...buttonStyle,
              background: "#4CAF50",
              color: "white",
              border: "none",
            }}
          >
            Add Burden
          </button>
        </div>
      </div>
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "15px" }}>
        Note: Some details like current entropy and interaction logs are managed
        within the widget itself.
      </p>
    </div>
  );
};
