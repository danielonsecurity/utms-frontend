import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";

export interface FocusEntry {
  id: string;
  title: string;
  type: string;
  parentId: string | null;
  completed: boolean;
  collapsed: boolean;
  createdAt: number;
  notes?: string;
}

export interface EntryType {
  name: string;
  color: string;
  icon?: string;
  canHaveChildren: boolean;
}

export interface FocusStreamConfig {
  name: string;
  entryTypes: EntryType[];
  // hierarchy: string[]; // Removed
  entries: FocusEntry[];
  showCompleted: boolean;
}

interface FocusStreamDisplayProps {
  config: FocusStreamConfig;
  onConfigChange: (newConfig: FocusStreamConfig) => void;
}

const FocusStreamDisplay: React.FC<FocusStreamDisplayProps> = ({
  config,
  onConfigChange,
}) => {
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryType, setNewEntryType] = useState(
    config.entryTypes[0]?.name || "",
  );
  const [newEntryParentId, setNewEntryParentId] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  const [parentInputDisplayValue, setParentInputDisplayValue] = useState(
    "📍 Top level (no parent)",
  );
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentInputRef = useRef<HTMLInputElement>(null);

  // Ensure newEntryType is valid if entryTypes change
  useEffect(() => {
    if (!config.entryTypes.find((et) => et.name === newEntryType)) {
      setNewEntryType(config.entryTypes[0]?.name || "");
    }
  }, [config.entryTypes, newEntryType]);

  // Build entry tree structure
  const entryTree = useMemo(() => {
    const tree: Map<string | null, FocusEntry[]> = new Map();
    config.entries.forEach((entry) => {
      if (!tree.has(entry.parentId)) {
        tree.set(entry.parentId, []);
      }
      tree.get(entry.parentId)!.push(entry);
    });
    return tree;
  }, [config.entries]);

  // Get entry type info
  const getEntryType = useCallback(
    (typeName: string): EntryType | undefined => {
      return config.entryTypes.find((t) => t.name === typeName);
    },
    [config.entryTypes],
  );

  // Build a path string for an entry (e.g., "Domain > Goal > Project")
  const getEntryPath = useCallback(
    (entryId: string): string => {
      const path: string[] = [];
      let currentEntry = config.entries.find((e) => e.id === entryId);
      while (currentEntry) {
        path.unshift(currentEntry.title);
        if (currentEntry.parentId) {
          currentEntry = config.entries.find(
            (e) => e.id === currentEntry.parentId,
          );
        } else {
          currentEntry = undefined;
        }
      }
      return path.join(" > ");
    },
    [config.entries],
  );

  // Get all possible parent entries (any entry that can have children)
  const getPossibleParents = useMemo((): FocusEntry[] => {
    return config.entries.filter((entry) => {
      const entryType = getEntryType(entry.type);
      return entryType?.canHaveChildren !== false;
    });
  }, [config.entries, getEntryType]);

  // Sync parentInputDisplayValue with newEntryParentId
  useEffect(() => {
    if (newEntryParentId === null) {
      setParentInputDisplayValue("📍 Top level (no parent)");
    } else {
      const parentEntry = config.entries.find((e) => e.id === newEntryParentId);
      if (parentEntry) {
        setParentInputDisplayValue(getEntryPath(parentEntry.id));
      } else {
        // Parent might have been deleted or ID is invalid, reset
        setNewEntryParentId(null);
        setParentInputDisplayValue("📍 Top level (no parent)");
      }
    }
  }, [newEntryParentId, config.entries, getEntryPath]);

  const addEntry = () => {
    if (!newEntryTitle.trim() || !newEntryType) {
      if (!newEntryType) alert("Please select an entry type.");
      return;
    }

    const newEntry: FocusEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: newEntryTitle.trim(),
      type: newEntryType,
      parentId: newEntryParentId,
      completed: false,
      collapsed: false,
      createdAt: Date.now(),
    };

    onConfigChange({
      ...config,
      entries: [...config.entries, newEntry],
    });

    setNewEntryTitle("");
    // Keep the parent and type selection for quick successive additions
    // If parentInputRef.current, focus it for the next entry
    if (parentInputRef.current) {
      // parentInputRef.current.focus(); // Optionally focus parent input or title input
    }
  };

  const toggleEntry = (id: string) => {
    const updatedEntries = config.entries.map((entry) =>
      entry.id === id ? { ...entry, completed: !entry.completed } : entry,
    );
    onConfigChange({ ...config, entries: updatedEntries });
  };

  const toggleCollapse = (id: string) => {
    const updatedEntries = config.entries.map((entry) =>
      entry.id === id ? { ...entry, collapsed: !entry.collapsed } : entry,
    );
    onConfigChange({ ...config, entries: updatedEntries });
  };

  const deleteEntry = (id: string) => {
    const idsToDelete = new Set<string>([id]);
    const addDescendants = (parentId: string) => {
      const children = entryTree.get(parentId) || [];
      children.forEach((child) => {
        idsToDelete.add(child.id);
        addDescendants(child.id);
      });
    };
    addDescendants(id);

    const updatedEntries = config.entries.filter(
      (entry) => !idsToDelete.has(entry.id),
    );
    onConfigChange({ ...config, entries: updatedEntries });
  };

  const renderEntry = (
    entry: FocusEntry,
    depth: number = 0,
  ): JSX.Element | null => {
    if (!config.showCompleted && entry.completed) return null;

    const entryType = getEntryType(entry.type);
    const children = entryTree.get(entry.id) || [];
    const hasChildren = children.length > 0;

    return (
      <div key={entry.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px",
            paddingLeft: `${depth * 20 + 8}px`,
            borderBottom: "1px solid #eee",
            backgroundColor: entry.completed ? "#f9f9f9" : "white",
            opacity: entry.completed ? 0.7 : 1,
            cursor: "default",
          }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleCollapse(entry.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
                fontSize: "12px",
                marginRight: "4px",
                color: "#555",
              }}
            >
              {entry.collapsed ? "▶" : "▼"}
            </button>
          )}
          {!hasChildren && (
            <span style={{ width: "20px", marginRight: "4px" }} />
          )}
          <span
            style={{
              fontSize: "16px",
              marginRight: "8px",
              color: entryType?.color || "#666",
            }}
            title={entry.type}
          >
            {entryType?.icon || "•"}
          </span>
          <input
            type="checkbox"
            checked={entry.completed}
            onChange={() => toggleEntry(entry.id)}
            style={{ marginRight: "10px" }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: entry.completed ? "line-through" : "none",
              color: entry.completed ? "#aaa" : "#333",
            }}
          >
            {entry.title}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: entryType?.color || "#666",
              marginRight: "10px",
              backgroundColor: entryType?.color
                ? `${entryType.color}20`
                : "#f0f0f0",
              padding: "2px 6px",
              borderRadius: "3px",
              fontWeight: "bold",
            }}
          >
            {entry.type}
          </span>
          <button
            onClick={() => deleteEntry(entry.id)}
            style={{
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#f44336",
              fontSize: "18px",
              padding: "0 5px",
            }}
          >
            ×
          </button>
        </div>
        {!entry.collapsed &&
          children.map((child) => renderEntry(child, depth + 1))}
      </div>
    );
  };

  const rootEntries = entryTree.get(null) || [];

  const isInputDisplayingCurrentSelectionPath = useMemo(() => {
    if (newEntryParentId === null) {
      return parentInputDisplayValue === "📍 Top level (no parent)";
    }
    const parentEntry = config.entries.find((e) => e.id === newEntryParentId);
    return parentEntry
      ? parentInputDisplayValue === getEntryPath(parentEntry.id)
      : false;
  }, [newEntryParentId, parentInputDisplayValue, config.entries, getEntryPath]);

  const filteredParentOptions = useMemo(() => {
    const options: Array<{
      id: string | null;
      display: string;
      pathString: string;
      icon?: string;
    }> = [
      {
        id: null,
        display: "📍 Top level (no parent)",
        pathString: "📍 Top level (no parent)",
      },
    ];

    getPossibleParents.forEach((parent) => {
      const path = getEntryPath(parent.id);
      const parentType = getEntryType(parent.type);
      const display = `${parentType?.icon || "📁"} ${path}`;

      const searchLower = parentInputDisplayValue.toLowerCase();
      // Show all if input is displaying current selection, or if search term matches
      if (
        isInputDisplayingCurrentSelectionPath ||
        path.toLowerCase().includes(searchLower) ||
        parentType?.name.toLowerCase().includes(searchLower)
      ) {
        options.push({
          id: parent.id,
          display,
          pathString: path,
          icon: parentType?.icon,
        });
      }
    });
    return options;
  }, [
    getPossibleParents,
    parentInputDisplayValue,
    getEntryPath,
    getEntryType,
    isInputDisplayingCurrentSelectionPath,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
        <div style={{ display: "flex", marginBottom: "8px" }}>
          <input
            type="text"
            value={newEntryTitle}
            onChange={(e) => setNewEntryTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addEntry()}
            placeholder="Add new entry..."
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={() => setExpandedView(!expandedView)}
            style={{
              marginLeft: "5px",
              padding: "8px",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title={
              expandedView
                ? "Hide type/parent options"
                : "Show type/parent options"
            }
          >
            {expandedView ? "−" : "+"}
          </button>
          <button
            onClick={addEntry}
            disabled={!newEntryTitle.trim() || !newEntryType}
            style={{
              marginLeft: "5px",
              padding: "8px 12px",
              backgroundColor:
                !newEntryTitle.trim() || !newEntryType ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !newEntryTitle.trim() || !newEntryType
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Add
          </button>
        </div>

        {expandedView && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              position: "relative",
            }}
          >
            <select
              value={newEntryType}
              onChange={(e) => setNewEntryType(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                minWidth: "120px",
                height: "34px",
              }}
            >
              {config.entryTypes.length === 0 && (
                <option value="">No types</option>
              )}
              {config.entryTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>

            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={parentInputRef}
                type="text"
                value={parentInputDisplayValue}
                onChange={(e) => {
                  setParentInputDisplayValue(e.target.value);
                  if (!isParentDropdownOpen) setIsParentDropdownOpen(true);
                }}
                onFocus={() => setIsParentDropdownOpen(true)}
                onBlur={() =>
                  setTimeout(() => setIsParentDropdownOpen(false), 150)
                } // Delay to allow click on dropdown
                placeholder="Search parent..."
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                  height: "34px",
                }}
              />
              {isParentDropdownOpen && filteredParentOptions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "0 0 4px 4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  }}
                >
                  {filteredParentOptions.map((opt) => (
                    <div
                      key={opt.id || "top-level"}
                      onMouseDown={(e) => e.preventDefault()} // Prevents onBlur from firing before click
                      onClick={() => {
                        setNewEntryParentId(opt.id);
                        setParentInputDisplayValue(
                          opt.id === null ? opt.display : opt.pathString,
                        ); // Set to pathString for actual parents
                        setIsParentDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 10px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                      }}
                      className="parent-option-item" // For potential hover effects via CSS
                    >
                      {opt.display}
                    </div>
                  ))}
                  {filteredParentOptions.length === 1 &&
                    filteredParentOptions[0].id === null &&
                    parentInputDisplayValue !== "📍 Top level (no parent)" && (
                      <div style={{ padding: "8px 10px", color: "#777" }}>
                        No matching parents found.
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .parent-option-item:hover {
          background-color: #f0f0f0;
        }
      `}</style>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        {rootEntries.length === 0 && config.entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              padding: "40px 20px",
            }}
          >
            No entries yet. Start by adding your domains, goals, and tasks!
          </div>
        ) : (
          rootEntries.map((entry) => renderEntry(entry))
        )}
        {rootEntries.length > 0 &&
          config.entries.length > 0 &&
          !rootEntries.some(
            (entry) => config.showCompleted || !entry.completed,
          ) &&
          config.entries.every((e) => e.completed) && (
            <div
              style={{
                textAlign: "center",
                color: "#999",
                padding: "40px 20px",
              }}
            >
              All entries are completed. Uncheck "Show completed entries" in
              config or add new items.
            </div>
          )}
      </div>

      <div
        style={{
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #ddd",
          fontSize: "12px",
          color: "#666",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          {config.entries.filter((e) => !e.completed).length} active items
        </span>
        {/* Removed hierarchy display */}
      </div>
    </div>
  );
};

export const FocusStreamWidget: React.FC<WidgetProps<FocusStreamConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
  onConfigChange,
}) => {
  return (
    <BaseWidget
      id={id}
      title={config.name || "Focus Stream"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <FocusStreamDisplay config={config} onConfigChange={onConfigChange} />
    </BaseWidget>
  );
};
