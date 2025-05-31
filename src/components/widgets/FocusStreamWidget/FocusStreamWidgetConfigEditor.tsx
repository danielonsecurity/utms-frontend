import React, { useState } from "react";
import { FocusStreamConfig, EntryType } from "./FocusStreamWidget";
import { WidgetConfigComponentProps } from "../../widgets/registry";

export const FocusStreamWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<FocusStreamConfig>
> = ({ config, onConfigChange }) => {
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#666666");
  const [newTypeIcon, setNewTypeIcon] = useState("•");
  const [newTypeCanHaveChildren, setNewTypeCanHaveChildren] = useState(true);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | boolean = value;

    if (type === "checkbox") {
      processedValue = (e.target as HTMLInputElement).checked;
    }

    onConfigChange({ ...config, [name]: processedValue });
  };

  const addEntryType = () => {
    if (!newTypeName.trim()) return;
    if (
      config.entryTypes.some(
        (et) => et.name.toLowerCase() === newTypeName.trim().toLowerCase(),
      )
    ) {
      alert(`Entry type "${newTypeName.trim()}" already exists.`);
      return;
    }

    const newType: EntryType = {
      name: newTypeName.trim(),
      color: newTypeColor,
      icon: newTypeIcon,
      canHaveChildren: newTypeCanHaveChildren,
    };

    onConfigChange({
      ...config,
      entryTypes: [...config.entryTypes, newType],
    });

    setNewTypeName("");
    setNewTypeColor("#666666");
    setNewTypeIcon("•");
    setNewTypeCanHaveChildren(true);
  };

  const updateEntryType = (index: number, updates: Partial<EntryType>) => {
    const updatedTypes = [...config.entryTypes];
    const oldName = updatedTypes[index].name;
    updatedTypes[index] = { ...updatedTypes[index], ...updates };

    // If name changed, check for duplicates (excluding the current one being edited)
    if (updates.name && updates.name.trim() !== oldName) {
      if (
        updatedTypes.some(
          (et, i) =>
            i !== index &&
            et.name.toLowerCase() === updates.name!.trim().toLowerCase(),
        )
      ) {
        alert(`Entry type "${updates.name!.trim()}" already exists.`);
        updatedTypes[index].name = oldName; // Revert name change
        onConfigChange({ ...config, entryTypes: updatedTypes }); // Propagate revert to UI
        return;
      }
    }

    onConfigChange({ ...config, entryTypes: updatedTypes });
  };

  const removeEntryType = (typeName: string) => {
    // Don't remove if it's in use
    if (config.entries.some((e) => e.type === typeName)) {
      alert(`Cannot remove type "${typeName}" because it has entries using it`);
      return;
    }

    onConfigChange({
      ...config,
      entryTypes: config.entryTypes.filter((t) => t.name !== typeName),
      // hierarchy removed: config.hierarchy.filter((h) => h !== typeName),
    });
  };

  // Hierarchy related functions (updateHierarchy, addHierarchyLevel, removeHierarchyLevel) are removed.

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label
          htmlFor="focusStreamName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Widget Name:
        </label>
        <input
          type="text"
          id="focusStreamName"
          name="name"
          value={config.name}
          onChange={handleChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          id="showCompleted"
          name="showCompleted"
          checked={config.showCompleted}
          onChange={handleChange}
        />
        <label htmlFor="showCompleted">Show completed entries</label>
      </div>

      <div>
        <h4 style={{ marginBottom: "10px" }}>Entry Types</h4>
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "10px",
          }}
        >
          {config.entryTypes.map((type, index) => (
            <div
              key={`${type.name}-${index}`} // Ensure key is unique even if names are temporarily same during edit
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "8px",
                padding: "8px",
                backgroundColor: "white",
                borderRadius: "4px",
                border: "1px solid #eee",
              }}
            >
              <input // Input for name
                type="text"
                value={type.name}
                onChange={(e) =>
                  updateEntryType(index, { name: e.target.value })
                }
                style={{
                  fontWeight: "bold",
                  border: "none",
                  marginRight: "8px",
                  flex: 1,
                  minWidth: "80px",
                  padding: "4px",
                }}
                placeholder="Type Name"
              />

              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="color"
                  value={type.color}
                  onChange={(e) =>
                    updateEntryType(index, { color: e.target.value })
                  }
                  style={{
                    width: "30px",
                    height: "30px",
                    marginRight: "8px",
                    padding: "0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <input
                  type="text"
                  value={type.icon}
                  onChange={(e) =>
                    updateEntryType(index, { icon: e.target.value })
                  }
                  style={{
                    width: "40px",
                    textAlign: "center",
                    marginRight: "8px",
                    padding: "4px",
                  }}
                  title="Icon (emoji or symbol)"
                  maxLength={2}
                />
                <div
                  style={{
                    marginRight: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    id={`canHaveChildren-${index}`}
                    checked={type.canHaveChildren}
                    onChange={(e) =>
                      updateEntryType(index, {
                        canHaveChildren: e.target.checked,
                      })
                    }
                    style={{ marginRight: "4px" }}
                  />
                  <label
                    htmlFor={`canHaveChildren-${index}`}
                    style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                  >
                    Can have children
                  </label>
                </div>
                <button
                  onClick={() => removeEntryType(type.name)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#f44336",
                    fontSize: "18px",
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {config.entryTypes.length === 0 && (
            <div
              style={{ padding: "10px", textAlign: "center", color: "#666" }}
            >
              No entry types defined. Add some below.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-end",
            backgroundColor: "#f5f5f5",
            padding: "10px",
            borderRadius: "4px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 150px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              New Type Name
            </label>
            <input
              type="text"
              placeholder="Type name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              style={{ width: "100%", padding: "6px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              Icon
            </label>
            <input
              type="text"
              placeholder="Icon"
              value={newTypeIcon}
              onChange={(e) => setNewTypeIcon(e.target.value)}
              style={{
                width: "40px",
                padding: "6px",
                textAlign: "center",
                boxSizing: "border-box",
              }}
              maxLength={2}
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              Color
            </label>
            <input
              type="color"
              value={newTypeColor}
              onChange={(e) => setNewTypeColor(e.target.value)}
              style={{
                width: "40px",
                height: "30px",
                padding: "2px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: "0 0 auto",
              paddingBottom: "1px",
            }}
          >
            <input
              type="checkbox"
              id="newTypeCanHaveChildren"
              checked={newTypeCanHaveChildren}
              onChange={(e) => setNewTypeCanHaveChildren(e.target.checked)}
              style={{ marginRight: "4px" }}
            />
            <label
              htmlFor="newTypeCanHaveChildren"
              style={{ fontSize: "12px" }}
            >
              Can have children
            </label>
          </div>
          <button
            onClick={addEntryType}
            style={{
              padding: "6px 12px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              height: "30px",
              alignSelf: "flex-end",
            }}
          >
            Add Type
          </button>
        </div>
      </div>

      {/* Hierarchy configuration section removed */}

      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "20px" }}>
        The Focus Stream helps you organize what to focus on by creating a
        flexible, hierarchical view of your domains, goals, projects, tasks, and
        more.
      </p>
    </div>
  );
};
