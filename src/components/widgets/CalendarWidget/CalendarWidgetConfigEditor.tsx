import React, { useState, useEffect } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { CalendarWidgetConfig, CalendarSource } from "../../../types/calendar";
import { entitiesApi } from "../../../api/entitiesApi";
import { EntityTypeDetail } from "../../../types/entities";

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

export const CalendarWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<CalendarWidgetConfig>
> = ({ config, onConfigChange }) => {
  const [entityTypes, setEntityTypes] = useState<EntityTypeDetail[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<
    { key: string; label: string }[]
  >([]);

  // State for the "add new" form
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAttribute, setSelectedAttribute] = useState("");

  // Fetch all entity types on mount
  useEffect(() => {
    entitiesApi.getEntityTypes().then(setEntityTypes);
  }, []);

  // Fetch categories when type changes
  useEffect(() => {
    if (selectedType) {
      entitiesApi
        .getCategoriesForEntityType(selectedType)
        .then((cats) => setCategories(["*", ...cats])); // '*' for all categories
    } else {
      setCategories([]);
    }
    setSelectedCategory("");
  }, [selectedType]);

  useEffect(() => {
    if (selectedType) {
      entitiesApi
        .getCategoriesForEntityType(selectedType)
        .then((cats) => setCategories(["*", ...cats])); // '*' for all
    } else {
      setCategories([]);
    }
    setSelectedCategory("");
  }, [selectedType]);

  const handleAddSource = () => {
    if (!selectedType || !selectedCategory) return;
    const newSource: CalendarSource = {
      id: `${selectedType}:${selectedCategory}`,
      entityType: selectedType,
      category: selectedCategory,
    };
    if (config.sources.some((s) => s.id === newSource.id)) return;
    onConfigChange({ ...config, sources: [...config.sources, newSource] });
  };

  const handleRemoveSource = (idToRemove: string) => {
    onConfigChange({
      ...config,
      sources: config.sources.filter((s) => s.id !== idToRemove),
    });
  };

  return (
    <div>
      {/* Widget Title input remains the same */}

      <h4 style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
        Calendar Sources
      </h4>
      {/* List of current sources */}
      <div>
        {config.sources.map((source) => (
          <div
            key={source.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>
              {source.entityType} / {source.category}
            </span>
            <button onClick={() => handleRemoveSource(source.id)}>
              Remove
            </button>
          </div>
        ))}
        {config.sources.length === 0 && <p>No sources added yet.</p>}
      </div>

      {/* Simplified form to add a new source */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: "10px",
          alignItems: "flex-end",
          marginTop: "15px",
        }}
      >
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={inputStyle}
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
          style={inputStyle}
          disabled={!selectedType}
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "*" ? "All Categories" : c}
            </option>
          ))}
        </select>
        <button onClick={handleAddSource} disabled={!selectedCategory}>
          + Add
        </button>
      </div>
    </div>
  );
};
