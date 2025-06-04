import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget"; // Adjust path
import { WidgetProps } from "../../../widgets/registry"; // Adjust path
import {
  EventLoopLoggerConfig,
  EventLoopEntry,
  ActionTakenType,
} from "./types";
import {
  formatTimeToLocale,
  getFullDateLocaleString,
  // Assuming you might want dateUtils like this:
  // getISODateString,
  // getDayShortName,
  // getPastDateStrings,
} from "../../../utils/dateUtils"; // Adjust path
import { Modal } from "../../common/Modal/Modal"; // Adjust path

interface MultiSelectTagEditorProps {
  idPrefix: string;
  availableItems: string[];
  selectedItems: string[];
  onChange: (newSelectedItems: string[]) => void;
  label: string;
  itemNoun?: string; // e.g., "emotion", "tag"
  configKeyForAdding?: keyof EventLoopLoggerConfig; // If new items can be added to global config
  onConfigChange?: (newConfig: EventLoopLoggerConfig) => void; // For adding new items globally
  currentConfig?: EventLoopLoggerConfig; // For adding new items globally
}

const MultiSelectTagEditor: React.FC<MultiSelectTagEditorProps> = ({
  idPrefix,
  availableItems,
  selectedItems,
  onChange,
  label,
  itemNoun = "item",
  // configKeyForAdding, onConfigChange, currentConfig // Global add deferred for simplicity now
}) => {
  const [inputValue, setInputValue] = useState("");

  const toggleItem = (item: string) => {
    const newSelected = selectedItems.includes(item)
      ? selectedItems.filter((i) => i !== item)
      : [...selectedItems, item];
    onChange(newSelected);
  };

  const handleAddCustomItem = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !selectedItems.includes(trimmedValue)) {
      onChange([...selectedItems, trimmedValue]);
    }
    setInputValue("");
  };

  const commonItemStyle: React.CSSProperties = {
    padding: "4px 8px",
    margin: "2px",
    borderRadius: "4px",
    cursor: "pointer",
    border: "1px solid #ccc",
    display: "inline-block",
    fontSize: "0.9em",
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "5px",
          fontWeight: "bold",
          fontSize: "0.9em",
        }}
      >
        {label}:
      </label>
      <div style={{ marginBottom: "5px", display: "flex", flexWrap: "wrap" }}>
        {availableItems.map((item) => (
          <span
            key={`${idPrefix}-avail-${item}`}
            onClick={() => toggleItem(item)}
            style={{
              ...commonItemStyle,
              background: selectedItems.includes(item) ? "#cce5ff" : "#f0f0f0",
              borderColor: selectedItems.includes(item) ? "#99caff" : "#ccc",
            }}
            title={`Click to ${selectedItems.includes(item) ? "deselect" : "select"} ${item}`}
          >
            {item} {selectedItems.includes(item) ? "✔" : ""}
          </span>
        ))}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Add custom ${itemNoun}...`}
          style={{
            flexGrow: 1,
            padding: "6px",
            marginRight: "5px",
            boxSizing: "border-box",
          }}
          onKeyPress={(e) =>
            e.key === "Enter" && (handleAddCustomItem(), e.preventDefault())
          }
        />
        <button
          type="button"
          onClick={handleAddCustomItem}
          style={{ padding: "6px 10px" }}
        >
          Add
        </button>
      </div>
      {selectedItems.length > 0 && (
        <div
          style={{
            borderTop: "1px dashed #eee",
            paddingTop: "5px",
            marginTop: "5px",
          }}
        >
          <strong>Selected:</strong>
          {selectedItems.map((item) => (
            <span
              key={`${idPrefix}-sel-${item}`}
              onClick={() => toggleItem(item)} // Click to deselect
              style={{
                ...commonItemStyle,
                background: "#e6ffe6",
                borderColor: "#adebad",
                cursor: "pointer",
              }}
              title={`Click to deselect ${item}`}
            >
              {item} ✕
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const getLocalDateTimeString = (isoString: string | undefined): string => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  try {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return ""; // Fallback if date is invalid
  }
};

const initialModalFormStateValues = {
  craving_timestamp: new Date().toISOString(),
  habit_type: "",
  trigger: "",
  location: "",
  craving_intensity: 5,
  emotional_state_before: [] as string[],
  impulse_description: "",
  action_taken: "unknown" as ActionTakenType,
  action_details: "",
  duration: "",
  substitute_action: "",
  emotional_state_after: [] as string[],
  reflection: "",
  tagged_as: [] as string[],
};

interface EventLogModalState {
  isOpen: boolean;
  mode: "initial" | "follow_up";
  entryToFollowUpOrEdit?: EventLoopEntry;
  formState: typeof initialModalFormStateValues;
  isOriginalDetailsCollapsed: boolean; // For follow-up mode
}

const stringToStringArray = (str: string): string[] => {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

// Helper to convert string array to comma-separated string
const stringArrayToString = (arr?: string[]): string => {
  return arr ? arr.join(", ") : "";
};

export const EventLoopLoggerWidget: React.FC<
  WidgetProps<EventLoopLoggerConfig>
> = ({ id, config, onRemove, onConfigChange, onWidgetConfigure }) => {
  const [logModalState, setLogModalState] = useState<EventLogModalState>({
    isOpen: false,
    mode: "initial",
    formState: {
      ...initialModalFormStateValues,
      craving_timestamp: new Date().toISOString(), // ensure it's fresh
      habit_type: config.habitTypes?.[0] || "",
    },
    isOriginalDetailsCollapsed: true,
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Reset collapse state when modal opens for follow-up
  useEffect(() => {
    if (logModalState.isOpen && logModalState.mode === "follow_up") {
      setLogModalState((prev) => ({
        ...prev,
        isOriginalDetailsCollapsed: true,
      }));
    }
  }, [logModalState.isOpen, logModalState.mode]);

  const sortedLogs = useMemo(() => {
    return [...(config.log || [])].sort(
      (a, b) =>
        new Date(b.craving_timestamp).getTime() -
        new Date(a.craving_timestamp).getTime(),
    );
  }, [config.log]);

  const pendingFollowUps = useMemo(() => {
    return sortedLogs.filter((entry) => entry.action_taken === "unknown");
  }, [sortedLogs]);

  const entriesPerPage = Math.max(1, config.entriesPerPage || 10);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sortedLogs.slice(startIndex, startIndex + entriesPerPage);
  }, [sortedLogs, currentPage, entriesPerPage]);
  const totalPages = Math.ceil(sortedLogs.length / entriesPerPage);

  const openInitialLogModal = () => {
    setLogModalState({
      isOpen: true,
      mode: "initial",
      entryToFollowUpOrEdit: undefined,
      formState: {
        ...initialModalFormStateValues,
        craving_timestamp: new Date().toISOString(),
        habit_type: config.habitTypes?.[0] || "",
        trigger: config.commonTriggers?.[0] || "",
        location: config.commonLocations?.[0] || "",
        emotional_state_before: [], // Reset arrays
        emotional_state_after: [],
        tagged_as: [],
      },
      isOriginalDetailsCollapsed: false, // Not relevant for initial
    });
  };

  const openFollowUpOrEditModal = (entry: EventLoopEntry) => {
    setLogModalState({
      isOpen: true,
      mode: "follow_up",
      entryToFollowUpOrEdit: entry,
      formState: {
        craving_timestamp: entry.craving_timestamp,
        habit_type: entry.habit_type,
        trigger: entry.trigger,
        location: entry.location || "",
        craving_intensity: entry.craving_intensity,
        emotional_state_before: [...(entry.emotional_state_before || [])],
        impulse_description: entry.impulse_description || "",
        action_taken:
          entry.action_taken === "unknown" ? "succumbed" : entry.action_taken,
        action_details: entry.action_details || "",
        duration: entry.duration || "",
        substitute_action: entry.substitute_action || "",
        emotional_state_after: [...(entry.emotional_state_after || [])],
        reflection: entry.reflection || "",
        tagged_as: [...(entry.tagged_as || [])],
      },
      isOriginalDetailsCollapsed: true, // Default to collapsed for follow-up
    });
  };

  const handleModalFormChange = (
    field: keyof EventLogModalState["formState"],
    value: string | number | string[],
  ) => {
    setLogModalState((prev) => ({
      ...prev,
      formState: { ...prev.formState, [field]: value },
    }));
  };

  const handleSaveLog = () => {
    const { formState, mode, entryToFollowUpOrEdit } = logModalState;

    if (!formState.habit_type.trim() || !formState.trigger.trim()) {
      alert("Habit Type and Trigger are required.");
      return;
    }
    if (
      !formState.craving_timestamp ||
      isNaN(new Date(formState.craving_timestamp).getTime())
    ) {
      alert(
        "Invalid craving timestamp. Please ensure the date and time are set correctly.",
      );
      return;
    }

    const newConfig = JSON.parse(
      JSON.stringify(config),
    ) as EventLoopLoggerConfig;
    if (!newConfig.log) newConfig.log = [];

    // Arrays are now directly managed by MultiSelectTagEditor, no string conversion needed here
    const emotional_state_before = formState.emotional_state_before;
    const emotional_state_after = formState.emotional_state_after;
    const tagged_as = formState.tagged_as;

    if (mode === "initial") {
      const newEntry: EventLoopEntry = {
        id: crypto.randomUUID(),
        craving_timestamp: new Date(formState.craving_timestamp).toISOString(), // Ensure UTC
        habit_type: formState.habit_type.trim(),
        trigger: formState.trigger.trim(),
        location: formState.location?.trim() || undefined,
        craving_intensity: Number(formState.craving_intensity),
        emotional_state_before,
        impulse_description: formState.impulse_description?.trim() || undefined,
        action_taken: "unknown",
        // Follow-up fields initially undefined
        emotional_state_after: [], // Initialize as empty arrays
        tagged_as: [],
      };
      newConfig.log.push(newEntry);
    } else if (entryToFollowUpOrEdit) {
      const entryIndex = newConfig.log.findIndex(
        (e) => e.id === entryToFollowUpOrEdit.id,
      );
      if (entryIndex > -1) {
        const updatedEntry: EventLoopEntry = {
          ...newConfig.log[entryIndex],
          // Initial fields (can be edited if form allows)
          craving_timestamp: new Date(
            formState.craving_timestamp,
          ).toISOString(), // Ensure UTC
          habit_type: formState.habit_type.trim(),
          trigger: formState.trigger.trim(),
          location: formState.location?.trim() || undefined,
          craving_intensity: Number(formState.craving_intensity),
          emotional_state_before,
          impulse_description:
            formState.impulse_description?.trim() || undefined,

          // Follow-up fields
          follow_up_timestamp:
            formState.action_taken !== "unknown"
              ? new Date().toISOString()
              : undefined,
          action_taken: formState.action_taken,
          action_details: formState.action_details?.trim() || undefined,
          duration: formState.duration?.trim() || undefined,
          substitute_action: formState.substitute_action?.trim() || undefined,
          emotional_state_after,
          reflection: formState.reflection?.trim() || undefined,
          tagged_as,
        };
        newConfig.log[entryIndex] = updatedEntry;
      }
    }

    onConfigChange?.(newConfig);
    setLogModalState({ ...logModalState, isOpen: false });
  };

  const handleDeleteLog = (entryId: string) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;

    const newConfig = JSON.parse(
      JSON.stringify(config),
    ) as EventLoopLoggerConfig;
    newConfig.log = (newConfig.log || []).filter((e) => e.id !== entryId);
    onConfigChange?.(newConfig);

    if (
      logModalState.isOpen &&
      logModalState.entryToFollowUpOrEdit?.id === entryId
    ) {
      setLogModalState({ ...logModalState, isOpen: false });
    }
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: "8px 12px",
    margin: "0 5px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  };
  const actionButtonStyles: React.CSSProperties = {
    ...buttonBaseStyle,
    background: "transparent",
    border: "none",
    padding: "4px 6px",
    fontSize: "0.9em",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "10px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "3px",
    fontWeight: "bold",
    fontSize: "0.9em",
  };

  const renderLogItem = (entry: EventLoopEntry) => {
    const isPending = entry.action_taken === "unknown";
    let cravingDisplayDate = "Invalid Date";
    let cravingDisplayTime = "Invalid Time";
    if (
      entry.craving_timestamp &&
      !isNaN(new Date(entry.craving_timestamp).getTime())
    ) {
      cravingDisplayDate = getFullDateLocaleString(entry.craving_timestamp);
      cravingDisplayTime = formatTimeToLocale(entry.craving_timestamp);
    }

    return (
      <div
        key={entry.id}
        style={{
          padding: "10px",
          border: "1px solid #eee",
          borderRadius: "4px",
          marginBottom: "10px",
          background: isPending ? "#fff9e6" : "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <strong style={{ fontSize: "1.1em" }}>{entry.habit_type}</strong>{" "}
            triggered by <strong>{entry.trigger}</strong>
            <div style={{ fontSize: "0.8em", color: "#555", marginTop: "3px" }}>
              {cravingDisplayDate} @ {cravingDisplayTime}
              {entry.location && ` (${entry.location})`}
            </div>
          </div>
          <div>
            <button
              title={isPending ? "Complete Follow-up" : "Edit Log"}
              onClick={() => openFollowUpOrEditModal(entry)}
              style={
                {
                  ...actionButtonStyles,
                  color: isPending ? "#ff9800" : "#2196F3",
                  marginRight: "5px",
                } as React.CSSProperties
              }
            >
              {isPending ? "✍️ Follow Up" : "✎ Edit"}
            </button>
            <button
              title="Delete Log"
              onClick={() => handleDeleteLog(entry.id)}
              style={
                {
                  ...actionButtonStyles,
                  color: "#f44336",
                } as React.CSSProperties
              }
            >
              🗑️
            </button>
          </div>
        </div>
        <div style={{ marginTop: "8px", fontSize: "0.9em" }}>
          <p style={{ margin: "2px 0" }}>
            <strong>Intensity:</strong> {entry.craving_intensity}/10
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>Emotions Before:</strong>{" "}
            {entry.emotional_state_before?.join(", ") || "N/A"}
          </p>
          {entry.impulse_description && (
            <p style={{ margin: "2px 0" }}>
              <strong>Felt like:</strong> <em>{entry.impulse_description}</em>
            </p>
          )}

          {!isPending && (
            <div
              style={{
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px dashed #eee",
              }}
            >
              <p style={{ margin: "2px 0" }}>
                <strong>Action Taken:</strong>{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      entry.action_taken === "succumbed"
                        ? "red"
                        : entry.action_taken === "resisted"
                          ? "green"
                          : "blue",
                  }}
                >
                  {entry.action_taken}
                </span>
              </p>
              {entry.action_details && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Details:</strong> {entry.action_details}
                </p>
              )}
              {entry.duration && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Duration:</strong> {entry.duration}
                </p>
              )}
              {entry.substitute_action && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Substitute:</strong> {entry.substitute_action}
                </p>
              )}
              <p style={{ margin: "2px 0" }}>
                <strong>Emotions After:</strong>{" "}
                {entry.emotional_state_after?.join(", ") || "N/A"}
              </p>
              {entry.reflection && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Reflection:</strong> <em>{entry.reflection}</em>
                </p>
              )}
              {entry.tagged_as && entry.tagged_as.length > 0 && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Tags:</strong> {entry.tagged_as.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle || "Event Loop Logger"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          padding: "10px",
          fontSize: "14px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            marginBottom: "15px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          <button
            onClick={openInitialLogModal}
            style={
              {
                ...buttonBaseStyle,
                background: "#4CAF50",
                color: "white",
                width: "100%",
                padding: "10px",
              } as React.CSSProperties
            }
          >
            ＋ Log New Urge / Craving
          </button>
        </div>
        {config.showPendingFollowUps && pendingFollowUps.length > 0 && (
          <div style={{ marginBottom: "15px" }}>
            <h4 style={{ marginTop: 0, marginBottom: "5px", color: "#ff9800" }}>
              Pending Follow-ups ({pendingFollowUps.length})
            </h4>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ffecb3",
                padding: "5px",
                borderRadius: "4px",
              }}
            >
              {pendingFollowUps.map(renderLogItem)}
            </div>
            <p
              style={{ fontSize: "0.8em", color: "#777", textAlign: "center" }}
            >
              These entries are awaiting your follow-up. Automatic reminders are
              not yet implemented.
            </p>
          </div>
        )}

        {/* View Switcher (Placeholder) */}
        <div style={{ marginBottom: "10px" }}>
          <select
            value={config.activeDisplayView || "log_list"}
            onChange={(e) => {
              onConfigChange?.({
                ...config,
                activeDisplayView: e.target.value as EventLoopLogView,
              });
              setCurrentPage(1); // Reset page when view changes
            }}
            style={{ ...buttonBaseStyle, width: "100%" } as React.CSSProperties}
          >
            <option value="log_list">View: Log List</option>
            <option value="stats_craving_action">
              View: Craving vs. Action
            </option>
            <option value="stats_emotion_delta">View: Emotion Delta</option>
            <option value="stats_trigger_frequency">
              View: Trigger Frequency
            </option>
            <option value="stats_time_heatmap">View: Time Heatmap</option>
          </select>
        </div>

        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          {/* Conditional rendering for analytics views will go here in Part 2 */}
          {config.activeDisplayView === "log_list" ||
          !config.activeDisplayView ? (
            <>
              <h4 style={{ marginTop: 0 }}>
                All Logged Events ({sortedLogs.length})
                {totalPages > 1 && ` - Page ${currentPage}/${totalPages}`}
              </h4>
              {sortedLogs.length === 0 && (
                <p>No events logged yet. Click the button above to start!</p>
              )}
              {paginatedLogs.map(renderLogItem)}
              {totalPages > 1 && (
                <div style={{ marginTop: "15px", textAlign: "center" }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={buttonBaseStyle as React.CSSProperties}
                  >
                    Previous
                  </button>
                  <span style={{ margin: "0 10px" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    style={buttonBaseStyle as React.CSSProperties}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            // This will be replaced by actual analytics rendering
            <div
              style={{ padding: "20px", textAlign: "center", color: "#777" }}
            >
              <p>
                Analytics view for "{config.activeDisplayView}" will be shown
                here.
              </p>
            </div>
          )}
        </div>
      </div>

      {logModalState.isOpen && (
        <Modal
          isOpen={logModalState.isOpen}
          onClose={() => setLogModalState({ ...logModalState, isOpen: false })}
          title={
            logModalState.mode === "initial"
              ? "Log New Urge/Craving"
              : "Complete Follow-up / Edit Log"
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              maxHeight: "70vh",
              overflowY: "auto",
              paddingRight: "10px",
            }}
          >
            <fieldset
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <legend
                style={{ cursor: "pointer" }}
                onClick={() =>
                  logModalState.mode === "follow_up" &&
                  setLogModalState((prev) => ({
                    ...prev,
                    isOriginalDetailsCollapsed:
                      !prev.isOriginalDetailsCollapsed,
                  }))
                }
              >
                {logModalState.mode === "initial"
                  ? "Craving Details"
                  : `Original Craving Details ${logModalState.isOriginalDetailsCollapsed ? "▼ (Click to expand)" : "▲ (Click to collapse)"}`}
              </legend>
              {!(
                logModalState.mode === "follow_up" &&
                logModalState.isOriginalDetailsCollapsed
              ) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label htmlFor="craving_timestamp" style={labelStyle}>
                      Timestamp:
                    </label>
                    <input
                      type="datetime-local"
                      id="craving_timestamp"
                      style={inputStyle}
                      value={getLocalDateTimeString(
                        logModalState.formState.craving_timestamp,
                      )}
                      onChange={(e) =>
                        handleModalFormChange(
                          "craving_timestamp",
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : new Date().toISOString(),
                        )
                      }
                      // disabled={logModalState.mode === 'follow_up'} // Allow editing timestamp for now
                    />
                  </div>
                  <div>
                    <label htmlFor="habit_type" style={labelStyle}>
                      Habit Type:
                    </label>
                    <input
                      list="habitTypesModal"
                      id="habit_type"
                      style={inputStyle}
                      value={logModalState.formState.habit_type}
                      onChange={(e) =>
                        handleModalFormChange("habit_type", e.target.value)
                      }
                    />
                    <datalist id="habitTypesModal">
                      {(config.habitTypes || []).map((ht) => (
                        <option key={ht} value={ht} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="trigger" style={labelStyle}>
                      Trigger:
                    </label>
                    <input
                      list="commonTriggersModal"
                      id="trigger"
                      style={inputStyle}
                      value={logModalState.formState.trigger}
                      onChange={(e) =>
                        handleModalFormChange("trigger", e.target.value)
                      }
                    />
                    <datalist id="commonTriggersModal">
                      {(config.commonTriggers || []).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="location" style={labelStyle}>
                      Location (optional):
                    </label>
                    <input
                      list="commonLocationsModal"
                      id="location"
                      style={inputStyle}
                      value={logModalState.formState.location}
                      onChange={(e) =>
                        handleModalFormChange("location", e.target.value)
                      }
                    />
                    <datalist id="commonLocationsModal">
                      {(config.commonLocations || []).map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                  </div>
                  {/* Time of Day REMOVED */}
                  <div>
                    <label htmlFor="craving_intensity" style={labelStyle}>
                      Craving Intensity (1-10):
                    </label>
                    <input
                      type="number"
                      id="craving_intensity"
                      style={inputStyle}
                      value={logModalState.formState.craving_intensity}
                      min="1"
                      max="10"
                      onChange={(e) =>
                        handleModalFormChange(
                          "craving_intensity",
                          parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </div>
                  <MultiSelectTagEditor
                    idPrefix="emotions-before"
                    availableItems={config.commonEmotions || []}
                    selectedItems={
                      logModalState.formState.emotional_state_before
                    }
                    onChange={(newItems) =>
                      handleModalFormChange("emotional_state_before", newItems)
                    }
                    label="Emotions Before"
                    itemNoun="emotion"
                  />
                  <div>
                    <label htmlFor="impulse_description" style={labelStyle}>
                      I felt like... (optional):
                    </label>
                    <textarea
                      id="impulse_description"
                      style={
                        {
                          ...inputStyle,
                          minHeight: "60px",
                        } as React.CSSProperties
                      }
                      rows={2}
                      value={logModalState.formState.impulse_description}
                      onChange={(e) =>
                        handleModalFormChange(
                          "impulse_description",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </fieldset>

            {/* Follow-up Fields - Only shown if mode is 'follow_up' or if editing */}
            {(logModalState.mode === "follow_up" ||
              logModalState.entryToFollowUpOrEdit) && (
              <fieldset
                style={{
                  border: "1px solid #4CAF50",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
                <legend>Follow-up / Action Details</legend>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label htmlFor="action_taken" style={labelStyle}>
                      Action Taken:
                    </label>
                    <select
                      id="action_taken"
                      style={inputStyle}
                      value={logModalState.formState.action_taken}
                      onChange={(e) =>
                        handleModalFormChange(
                          "action_taken",
                          e.target.value as ActionTakenType,
                        )
                      }
                    >
                      <option value="succumbed">Succumbed to impulse</option>
                      <option value="resisted">Resisted impulse</option>
                      <option value="redirected">Redirected impulse</option>
                      {logModalState.entryToFollowUpOrEdit?.action_taken ===
                        "unknown" && (
                        <option value="unknown" disabled>
                          Pending Follow-up
                        </option>
                      )}
                    </select>
                  </div>
                  {logModalState.formState.action_taken === "succumbed" && (
                    <div>
                      <label htmlFor="action_details" style={labelStyle}>
                        What happened? (e.g., "Scrolled for 1hr"):
                      </label>
                      <textarea
                        id="action_details"
                        style={{ ...inputStyle, minHeight: "60px" }}
                        rows={2}
                        value={logModalState.formState.action_details}
                        onChange={(e) =>
                          handleModalFormChange(
                            "action_details",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                  {logModalState.formState.action_taken === "redirected" && (
                    <div>
                      <label htmlFor="substitute_action" style={labelStyle}>
                        What did you do instead?
                      </label>
                      <input
                        list="commonSubstituteActions"
                        id="substitute_action"
                        style={inputStyle}
                        value={logModalState.formState.substitute_action}
                        onChange={(e) =>
                          handleModalFormChange(
                            "substitute_action",
                            e.target.value,
                          )
                        }
                      />
                      <datalist id="commonSubstituteActions">
                        {(config.commonSubstituteActions || []).map((sa) => (
                          <option key={sa} value={sa} />
                        ))}
                      </datalist>
                    </div>
                  )}
                  {(logModalState.formState.action_taken === "succumbed" ||
                    logModalState.formState.action_taken === "redirected") && (
                    <div>
                      <label htmlFor="duration" style={labelStyle}>
                        Duration (optional, e.g., "30m", "1h"):
                      </label>
                      <input
                        type="text"
                        id="duration"
                        style={inputStyle}
                        value={logModalState.formState.duration}
                        onChange={(e) =>
                          handleModalFormChange("duration", e.target.value)
                        }
                      />
                    </div>
                  )}
                  <MultiSelectTagEditor
                    idPrefix="emotions-after"
                    availableItems={config.commonEmotions || []}
                    selectedItems={
                      logModalState.formState.emotional_state_after
                    }
                    onChange={(newItems) =>
                      handleModalFormChange("emotional_state_after", newItems)
                    }
                    label="Emotions After (optional)"
                    itemNoun="emotion"
                  />
                  <div>
                    <label htmlFor="reflection" style={labelStyle}>
                      Reflection / Lessons Learned (optional):
                    </label>
                    <textarea
                      id="reflection"
                      style={
                        {
                          ...inputStyle,
                          minHeight: "80px",
                        } as React.CSSProperties
                      }
                      rows={3}
                      value={logModalState.formState.reflection}
                      onChange={(e) =>
                        handleModalFormChange("reflection", e.target.value)
                      }
                    />
                  </div>
                  <MultiSelectTagEditor
                    idPrefix="tags"
                    availableItems={config.commonTags || []}
                    selectedItems={logModalState.formState.tagged_as}
                    onChange={(newItems) =>
                      handleModalFormChange("tagged_as", newItems)
                    }
                    label="Tags (optional)"
                    itemNoun="tag"
                  />
                </div>
              </fieldset>
            )}

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div>
                {logModalState.mode === "follow_up" &&
                  logModalState.entryToFollowUpOrEdit && (
                    <button
                      onClick={() =>
                        handleDeleteLog(logModalState.entryToFollowUpOrEdit!.id)
                      }
                      style={{
                        ...buttonBaseStyle,
                        background: "#f44336",
                        color: "white",
                        border: "none",
                      }}
                    >
                      Delete Log
                    </button>
                  )}
              </div>
              <div>
                <button
                  onClick={() =>
                    setLogModalState({ ...logModalState, isOpen: false })
                  }
                  style={{ ...buttonBaseStyle, marginRight: "10px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLog}
                  style={{
                    ...buttonBaseStyle,
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                  }}
                  disabled={
                    !logModalState.formState.habit_type ||
                    !logModalState.formState.trigger
                  }
                >
                  {logModalState.mode === "initial"
                    ? "Log Initial Craving"
                    : "Save Follow-up / Changes"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </BaseWidget>
  );
};
