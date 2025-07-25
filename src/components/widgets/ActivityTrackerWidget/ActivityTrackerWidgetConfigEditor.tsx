import React, { useState, useEffect } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { ActivityTrackerConfig, MetadataFieldDef } from "./types";
import { entitiesApi } from "../../../api/entitiesApi";
import { EntityTypeDetail } from "../../../types/entities";

// Helper for styling form elements
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  marginBottom: "10px",
  border: "1px solid #ccc",
  borderRadius: "4px",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  fontSize: "0.9em",
};
const sectionHeaderStyle: React.CSSProperties = {
  marginTop: 0,
  borderBottom: "1px solid #ddd",
  paddingBottom: "8px",
  marginBottom: "15px",
};

// Metadata Field Editor Sub-component
const MetadataFieldEditor: React.FC<{
  field: MetadataFieldDef;
  index: number;
  onFieldChange: (index: number, field: MetadataFieldDef) => void;
  onRemoveField: (index: number) => void;
}> = ({ field, index, onFieldChange, onRemoveField }) => {
  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: "10px",
        borderRadius: "4px",
        marginBottom: "10px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto",
        gap: "10px",
        alignItems: "flex-end",
      }}
    >
      <div>
        <label style={labelStyle}>Field Label</label>
        <input
          type="text"
          value={field.label}
          placeholder="e.g., Sleep Quality"
          onChange={(e) =>
            onFieldChange(index, { ...field, label: e.target.value })
          }
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>
      <div>
        <label style={labelStyle}>Data Key</label>
        <input
          type="text"
          value={field.name}
          placeholder="e.g., quality"
          onChange={(e) =>
            onFieldChange(index, {
              ...field,
              name: e.target.value.replace(/\s+/g, "_").toLowerCase(),
            })
          }
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>
      <div>
        <label style={labelStyle}>Input Type</label>
        <select
          value={field.type}
          onChange={(e) =>
            onFieldChange(index, {
              ...field,
              type: e.target.value as MetadataFieldDef["type"],
            })
          }
          style={{ ...inputStyle, marginBottom: 0 }}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="rating">Rating (1-5)</option>
        </select>
      </div>
      <button
        onClick={() => onRemoveField(index)}
        style={{
          height: "38px",
          background: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Remove
      </button>
    </div>
  );
};

const TrackedActivitiesManager: React.FC<{
  activities: TrackedActivity[];
  onChange: (activities: TrackedActivity[]) => void;
}> = ({ activities, onChange }) => {
  // State for the "Add New" dropdowns
  const [entityTypes, setEntityTypes] = useState<EntityTypeDetail[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  // --- Data fetching effects for dropdowns (similar to before) ---
  useEffect(() => {
    const fetchTypes = async () => {
      const allTypes = await entitiesApi.getEntityTypes();
      const trackableTypes = allTypes.filter(
        (type) =>
          "active-occurrence-start-time" in type.attributes &&
          "occurrences" in type.attributes,
      );
      setEntityTypes(trackableTypes);
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    const fetchCategories = async () => {
      setCategories(await entitiesApi.getCategoriesForEntityType(selectedType));
    };
    fetchCategories();
  }, [selectedType]);

  useEffect(() => {
    if (!selectedType || !selectedCategory) return;
    const fetchEntities = async () => {
      const fetched = await entitiesApi.getEntities(
        selectedType,
        selectedCategory,
      );
      setEntities(fetched.map((e) => e.name));
    };
    fetchEntities();
  }, [selectedType, selectedCategory]);

  // --- Handlers ---
  const handleAddActivity = () => {
    if (!selectedType || !selectedCategory || !selectedEntity) return;

    const newActivity: TrackedActivity = {
      id: `${selectedType}:${selectedCategory}:${selectedEntity}`,
      entityType: selectedType,
      entityCategory: selectedCategory,
      entityName: selectedEntity,
    };

    // Prevent duplicates
    if (activities.some((a) => a.id === newActivity.id)) {
      alert("This activity is already being tracked.");
      return;
    }

    onChange([...activities, newActivity]);
  };

  const handleRemoveActivity = (idToRemove: string) => {
    onChange(activities.filter((a) => a.id !== idToRemove));
  };

  return (
    <div>
      {/* List of currently tracked activities */}
      <div
        style={{
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        {activities.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", padding: "10px" }}>
            No activities selected.
          </p>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {act.entityName}{" "}
                <em style={{ fontSize: "0.8em", color: "#777" }}>
                  ({act.entityType}/{act.category})
                </em>
              </span>
              <button
                onClick={() => handleRemoveActivity(act.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f44336",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Form to add a new activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: "10px",
          alignItems: "flex-end",
          borderTop: "1px solid #eee",
          paddingTop: "15px",
        }}
      >
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        >
          <option value="">Select Type</option>
          {entityTypes.map((t) => (
            <option key={t.name} value={t.name}>
              {t.displayName}
            </option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
          disabled={!selectedType}
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
          disabled={!selectedCategory}
        >
          <option value="">Select Activity</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button onClick={handleAddActivity} disabled={!selectedEntity}>
          + Add
        </button>
      </div>
    </div>
  );
};

export const ActivityTrackerWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<ActivityTrackerConfig>
> = ({ config, onConfigChange }) => {
  // --- State for cascading dropdowns (same as before) ---
  const [entityTypes, setEntityTypes] = useState<EntityTypeDetail[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // --- Effects for fetching data (same as before) ---
  useEffect(() => {
    const fetchTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const allTypes = await entitiesApi.getEntityTypes();

        // Filter by capability, not by name. A type is "trackable" if it has
        // the attributes needed to start and log occurrences.
        const trackableTypes = allTypes.filter(
          (type) =>
            "active-occurrence-start-time" in type.attributes &&
            "occurrences" in type.attributes,
        );

        setEntityTypes(trackableTypes);

        // This auto-selection logic is still useful if there's only one trackable type
        if (trackableTypes.length === 1 && !config.entityType) {
          handleConfigChange("entityType", trackableTypes[0].name);
        }
      } catch (error) {
        console.error(
          "Failed to fetch entity types for ActivityTracker",
          error,
        );
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!config.entityType) {
      setCategories([]);
      return;
    }
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      setCategories([]);
      try {
        const fetched = await entitiesApi.getCategoriesForEntityType(
          config.entityType!,
        );
        setCategories(fetched);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [config.entityType]);

  useEffect(() => {
    if (!config.entityType || !config.entityCategory) {
      setEntities([]);
      return;
    }
    const fetchEntities = async () => {
      setIsLoadingEntities(true);
      setEntities([]);
      try {
        const fetched = await entitiesApi.getEntities(
          config.entityType!,
          config.entityCategory!,
        );
        setEntities(fetched.map((e) => e.name));
      } finally {
        setIsLoadingEntities(false);
      }
    };
    fetchEntities();
  }, [config.entityType, config.entityCategory]);

  const handleConfigChange = (key: keyof ActivityTrackerConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    if (key === "entityType") {
      newConfig.entityCategory = null;
      newConfig.entityName = null;
    }
    if (key === "entityCategory") {
      newConfig.entityName = null;
    }
    onConfigChange(newConfig);
  };

  // --- Metadata Field Handlers ---
  const handleAddField = () => {
    const newField: MetadataFieldDef = { name: "", label: "", type: "text" };
    const newFields = [...(config.metadataFields || []), newField];
    onConfigChange({ ...config, metadataFields: newFields });
  };

  const handleFieldChange = (index: number, field: MetadataFieldDef) => {
    const newFields = [...(config.metadataFields || [])];
    newFields[index] = field;
    onConfigChange({ ...config, metadataFields: newFields });
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...(config.metadataFields || [])].filter(
      (_, i) => i !== index,
    );
    onConfigChange({ ...config, metadataFields: newFields });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor="widgetTitle" style={labelStyle}>
          Widget Title:
        </label>
        <input
          type="text"
          id="widgetTitle"
          value={config.widgetTitle}
          onChange={(e) => handleConfigChange("widgetTitle", e.target.value)}
          style={inputStyle}
          placeholder="e.g., Workout Tracker"
        />
      </div>
      <div style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
        <h4 style={sectionHeaderStyle}>Tracked Activities</h4>
        <TrackedActivitiesManager
          activities={config.trackedActivities || []}
          onChange={(newActivities) =>
            handleConfigChange("trackedActivities", newActivities)
          }
        />
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
        <h4 style={sectionHeaderStyle}>Completion Metadata</h4>
        <p style={{ fontSize: "0.8em", color: "#666", marginTop: "-10px" }}>
          Define fields to fill out when an activity is logged. A "Notes" field
          is always included.
        </p>
        {(config.metadataFields || []).map((field, index) => (
          <MetadataFieldEditor
            key={index}
            index={index}
            field={field}
            onFieldChange={handleFieldChange}
            onRemoveField={handleRemoveField}
          />
        ))}
        <button onClick={handleAddField}>+ Add Metadata Field</button>
      </div>
    </div>
  );
};
