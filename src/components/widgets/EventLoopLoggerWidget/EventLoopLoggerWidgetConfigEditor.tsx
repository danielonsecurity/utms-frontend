import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path
import { EventLoopLoggerConfig } from "./types";

interface ListManagementProps {
  list: string[];
  listName: string; // e.g., "Habit Types"
  onChange: (newList: string[]) => void;
  inputPlaceholder: string;
}

// Reusable component for managing a list of strings
const ListManager: React.FC<ListManagementProps> = ({
  list,
  listName,
  onChange,
  inputPlaceholder,
}) => {
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    if (list.includes(newItem.trim())) {
      alert(`"${newItem.trim()}" is already in the list.`);
      return;
    }
    onChange([...list, newItem.trim()]);
    setNewItem("");
  };

  const handleRemoveItem = (itemToRemove: string) => {
    onChange(list.filter((item) => item !== itemToRemove));
  };

  const handleEditItem = (oldItem: string, updatedItem: string) => {
    if (!updatedItem.trim()) {
      // if updated to empty, effectively remove
      handleRemoveItem(oldItem);
      return;
    }
    if (list.includes(updatedItem.trim()) && oldItem !== updatedItem.trim()) {
      alert(`"${updatedItem.trim()}" is already in the list.`);
      return;
    }
    onChange(
      list.map((item) => (item === oldItem ? updatedItem.trim() : item)),
    );
  };

  const itemInputStyle: React.CSSProperties = {
    flexGrow: 1,
    padding: "6px",
    boxSizing: "border-box",
    marginRight: "5px",
  };
  const itemButtonStyle: React.CSSProperties = {
    padding: "6px 10px",
    cursor: "pointer",
    background: "#f0f0f0",
    border: "1px solid #ccc",
  };

  return (
    <div
      style={{
        marginBottom: "15px",
        padding: "10px",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
      }}
    >
      <h5 style={{ marginTop: 0, marginBottom: "10px" }}>{listName}:</h5>
      {list.map((item, index) => (
        <div
          key={`${listName}-${index}`}
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
        >
          <input
            type="text"
            value={item}
            onChange={(e) => handleEditItem(item, e.target.value)}
            style={itemInputStyle}
          />
          <button
            onClick={() => handleRemoveItem(item)}
            style={{
              ...itemButtonStyle,
              background: "#ffdddd",
              borderColor: "#ffaaaa",
              color: "#c00",
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <div style={{ display: "flex", marginTop: "10px" }}>
        <input
          type="text"
          placeholder={`Add new ${inputPlaceholder}...`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
          style={{ ...itemInputStyle, marginRight: "5px" }}
        />
        <button
          onClick={handleAddItem}
          style={{
            ...itemButtonStyle,
            background: "#ddffdd",
            borderColor: "#aaffaa",
            color: "#060",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export const EventLoopLoggerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<EventLoopLoggerConfig>
> = ({ config, onConfigChange }) => {
  const handleFieldChange = (
    field: keyof EventLoopLoggerConfig,
    value: any,
  ) => {
    onConfigChange({ ...config, [field]: value });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "5px",
  };
  const numberInputStyle: React.CSSProperties = {
    width: "80px",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "5px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxHeight: "70vh",
        overflowY: "auto",
        padding: "5px",
      }}
    >
      <div>
        <label htmlFor="eventLoopWidgetTitle" /* ... */>Widget Title:</label>
        <input /* ... */ />
      </div>

      <ListManager
        listName="Habit Types"
        list={config.habitTypes || []}
        onChange={(newList) => handleFieldChange("habitTypes", newList)}
        inputPlaceholder="habit type (e.g., Snacking)"
      />
      <ListManager
        listName="Common Triggers"
        list={config.commonTriggers || []}
        onChange={(newList) => handleFieldChange("commonTriggers", newList)}
        inputPlaceholder="trigger (e.g., Boredom)"
      />
      <ListManager
        listName="Common Locations"
        list={config.commonLocations || []}
        onChange={(newList) => handleFieldChange("commonLocations", newList)}
        inputPlaceholder="location (e.g., Home)"
      />
      {/* ListManager for commonTimesOfDay REMOVED */}
      <ListManager
        listName="Common Emotions"
        list={config.commonEmotions || []}
        onChange={(newList) => handleFieldChange("commonEmotions", newList)}
        inputPlaceholder="emotion (e.g., Anxious)"
      />
      <ListManager
        listName="Common Tags"
        list={config.commonTags || []}
        onChange={(newList) => handleFieldChange("commonTags", newList)}
        inputPlaceholder="tag (e.g., Avoidance)"
      />
      <ListManager
        listName="Common Substitute Actions"
        list={config.commonSubstituteActions || []}
        onChange={(newList) =>
          handleFieldChange("commonSubstituteActions", newList)
        }
        inputPlaceholder="substitute (e.g., Drink Water)"
      />

      <div>
        <label htmlFor="defaultFollowUpDelay" style={labelStyle}>
          Default Follow-up Reminder Delay (minutes):
        </label>
        <input
          type="number"
          id="defaultFollowUpDelay"
          value={config.defaultFollowUpDelayMinutes}
          onChange={(e) =>
            handleFieldChange(
              "defaultFollowUpDelayMinutes",
              parseInt(e.target.value, 10) || 15,
            )
          }
          min="1"
          style={numberInputStyle}
        />
        <p style={{ fontSize: "0.8em", color: "#555", margin: "2px 0 0 0" }}>
          This is currently for user reference. Automatic prompts are not yet
          implemented.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Display Options:</label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            id="showPendingFollowUps"
            checked={config.showPendingFollowUps}
            onChange={(e) =>
              handleFieldChange("showPendingFollowUps", e.target.checked)
            }
          />
          <label
            htmlFor="showPendingFollowUps"
            style={{ fontWeight: "normal" }}
          >
            Show "Pending Follow-ups" section
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="entriesPerPage" style={labelStyle}>
          Entries per Page (in Log List view):
        </label>
        <input
          type="number"
          id="entriesPerPage"
          value={config.entriesPerPage}
          onChange={(e) =>
            handleFieldChange(
              "entriesPerPage",
              parseInt(e.target.value, 10) || 10,
            )
          }
          min="1"
          max="50"
          style={numberInputStyle}
        />
      </div>

      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "15px" }}>
        Note: Changes are applied when you save the widget configuration.
        Deleting items from these lists will not remove them from existing log
        entries but they will no longer appear as suggestions. Automatic
        follow-up prompts are not yet implemented; "Pending Follow-ups" list
        serves as a manual reminder.
      </p>
    </div>
  );
};
