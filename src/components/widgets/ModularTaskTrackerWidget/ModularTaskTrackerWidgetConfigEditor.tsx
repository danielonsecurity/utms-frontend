import React, { useState } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path as needed
import { ModularTaskTrackerConfig, ModuleDefinition } from "./types"; // Using types.ts

// Helper to generate a simple unique ID for new modules
const generateModuleId = (): string =>
  `mod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

interface ModuleFormState extends Omit<ModuleDefinition, "id"> {
  // For the form, ID is handled separately or not present for new modules
}

const INITIAL_MODULE_FORM_STATE: ModuleFormState = {
  name: "",
  location: "",
  effort: 1,
  frequencyDays: 7,
  notes: "",
};

export const ModularTaskTrackerConfigEditor: React.FC<
  WidgetConfigComponentProps<ModularTaskTrackerConfig>
> = ({ config, onConfigChange }) => {
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(
    INITIAL_MODULE_FORM_STATE,
  );
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const handleGlobalConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "number") {
      processedValue = parseInt(value, 10);
      if (isNaN(processedValue as number))
        processedValue =
          name === "sessionEffortThreshold"
            ? 10
            : name === "snoozeDurationDays"
              ? 1
              : 0;
    } else if (type === "checkbox") {
      processedValue = (e.target as HTMLInputElement).checked;
    }

    onConfigChange({ ...config, [name]: processedValue });
  };

  const handleModuleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setModuleForm((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleAddOrUpdateModule = () => {
    if (
      !moduleForm.name.trim() ||
      moduleForm.frequencyDays <= 0 ||
      moduleForm.effort <= 0
    ) {
      alert(
        "Module Name, a positive Frequency (days), and a positive Effort are required.",
      );
      return;
    }

    let updatedModules: ModuleDefinition[];
    if (editingModuleId) {
      updatedModules = config.modules.map((m) =>
        m.id === editingModuleId ? { ...moduleForm, id: editingModuleId } : m,
      );
    } else {
      const newModule: ModuleDefinition = {
        ...moduleForm,
        id: generateModuleId(),
      };
      updatedModules = [...config.modules, newModule];
    }
    onConfigChange({ ...config, modules: updatedModules });
    setModuleForm(INITIAL_MODULE_FORM_STATE);
    setEditingModuleId(null);
  };

  const handleEditModule = (module: ModuleDefinition) => {
    setEditingModuleId(module.id);
    setModuleForm({
      name: module.name,
      location: module.location,
      effort: module.effort,
      frequencyDays: module.frequencyDays,
      notes: module.notes || "",
    });
  };

  const handleRemoveModule = (moduleId: string) => {
    if (window.confirm("Are you sure you want to remove this module?")) {
      const updatedModules = config.modules.filter((m) => m.id !== moduleId);
      onConfigChange({ ...config, modules: updatedModules });
      if (editingModuleId === moduleId) {
        // If removing the module being edited
        setModuleForm(INITIAL_MODULE_FORM_STATE);
        setEditingModuleId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setModuleForm(INITIAL_MODULE_FORM_STATE);
    setEditingModuleId(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "5px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "3px",
    fontWeight: "bold",
  };
  const fieldsetStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "4px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    marginRight: "5px",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Global Config Options */}
      <fieldset style={fieldsetStyle}>
        <legend>Global Settings</legend>
        <div>
          <label htmlFor="widgetTitle" style={labelStyle}>
            Widget Title:
          </label>
          <input
            type="text"
            id="widgetTitle"
            name="widgetTitle"
            value={config.widgetTitle}
            onChange={handleGlobalConfigChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="defaultView" style={labelStyle}>
            Default View:
          </label>
          <select
            id="defaultView"
            name="defaultView"
            value={config.defaultView}
            onChange={handleGlobalConfigChange}
            style={inputStyle}
          >
            <option value="list">All Tasks List</option>
            <option value="by_location">Tasks by Location</option>
          </select>
        </div>
        <div>
          <label htmlFor="sessionEffortThreshold" style={labelStyle}>
            Session Max Effort:
          </label>
          <input
            type="number"
            id="sessionEffortThreshold"
            name="sessionEffortThreshold"
            value={config.sessionEffortThreshold}
            onChange={handleGlobalConfigChange}
            min="1"
            style={inputStyle}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <input
            type="checkbox"
            id="allowSnooze"
            name="allowSnooze"
            checked={config.allowSnooze}
            onChange={handleGlobalConfigChange}
          />
          <label htmlFor="allowSnooze">Allow Snoozing Tasks</label>
        </div>
        {config.allowSnooze && (
          <div>
            <label htmlFor="snoozeDurationDays" style={labelStyle}>
              Default Snooze Duration (days):
            </label>
            <input
              type="number"
              id="snoozeDurationDays"
              name="snoozeDurationDays"
              value={config.snoozeDurationDays}
              onChange={handleGlobalConfigChange}
              min="1"
              style={inputStyle}
            />
          </div>
        )}
      </fieldset>

      {/* Module Management */}
      <fieldset style={fieldsetStyle}>
        <legend>{editingModuleId ? "Edit Module" : "Add New Module"}</legend>
        <div>
          <label htmlFor="moduleName" style={labelStyle}>
            Name*:
          </label>
          <input
            type="text"
            id="moduleName"
            name="name"
            value={moduleForm.name}
            onChange={handleModuleFormChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="moduleLocation" style={labelStyle}>
            Location:
          </label>
          <input
            type="text"
            id="moduleLocation"
            name="location"
            value={moduleForm.location}
            onChange={handleModuleFormChange}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="moduleEffort" style={labelStyle}>
            Effort (e.g., 1-5)*:
          </label>
          <input
            type="number"
            id="moduleEffort"
            name="effort"
            value={moduleForm.effort}
            onChange={handleModuleFormChange}
            min="1"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="moduleFrequency" style={labelStyle}>
            Frequency (days)*:
          </label>
          <input
            type="number"
            id="moduleFrequency"
            name="frequencyDays"
            value={moduleForm.frequencyDays}
            onChange={handleModuleFormChange}
            min="1"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="moduleNotes" style={labelStyle}>
            Notes:
          </label>
          <textarea
            id="moduleNotes"
            name="notes"
            value={moduleForm.notes}
            onChange={handleModuleFormChange}
            style={{ ...inputStyle, height: "60px" }}
          />
        </div>
        <button
          onClick={handleAddOrUpdateModule}
          style={{ ...buttonStyle, backgroundColor: "#4CAF50", color: "white" }}
        >
          {editingModuleId ? "Update Module" : "Add Module"}
        </button>
        {editingModuleId && (
          <button
            onClick={handleCancelEdit}
            style={{
              ...buttonStyle,
              backgroundColor: "#f44336",
              color: "white",
            }}
          >
            Cancel Edit
          </button>
        )}
      </fieldset>

      {/* List of Existing Modules */}
      {config.modules && config.modules.length > 0 && (
        <fieldset style={fieldsetStyle}>
          <legend>Existing Modules</legend>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {config.modules.map((module) => (
              <li
                key={module.id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "10px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{module.name}</strong> ({module.location})
                  <br />
                  <small>
                    Effort: {module.effort}, Freq: {module.frequencyDays}d
                  </small>
                  {module.notes && (
                    <>
                      <br />
                      <small>
                        <em>
                          Notes: {module.notes.substring(0, 50)}
                          {module.notes.length > 50 ? "..." : ""}
                        </em>
                      </small>
                    </>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => handleEditModule(module)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#2196F3",
                      color: "white",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveModule(module.id)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#f44336",
                      color: "white",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "15px" }}>
        Note: Changes are applied immediately. Close this editor to save them
        with the dashboard.
      </p>
    </div>
  );
};
