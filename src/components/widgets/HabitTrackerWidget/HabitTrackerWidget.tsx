import React, { useState, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import {
  HabitTrackerConfig,
  HabitAction,
  HabitActionLogEntry,
  DailyLog,
} from "./types";
import {
  getISODateString,
  formatTimeToLocale,
  getFullDateLocaleString,
  getDayShortName,
  getPastDateStrings,
} from "../../../utils/dateUtils";
import { Modal } from "../../common/Modal/Modal"; // Assuming a Modal component exists

// Helper to get today's date key consistently
const getTodayKey = () => getISODateString(new Date());

interface EditLogModalState {
  isOpen: boolean;
  actionId: string | null;
  actionName?: string;
  dateKey: string; // YYYY-MM-DD
  currentTimestamp: string; // ISO string for editing
  currentNotes: string;
}

export const HabitTrackerWidget: React.FC<WidgetProps<HabitTrackerConfig>> = ({
  id,
  config,
  onRemove,
  onConfigChange,
  onWidgetConfigure,
}) => {
  const [todayKey, setTodayKey] = useState(getTodayKey()); // In case app runs past midnight

  const [editModalState, setEditModalState] = useState<EditLogModalState>({
    isOpen: false,
    actionId: null,
    dateKey: todayKey,
    currentTimestamp: new Date().toISOString(),
    currentNotes: "",
  });

  // Update todayKey if the date changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newTodayKey = getTodayKey();
      if (newTodayKey !== todayKey) {
        setTodayKey(newTodayKey);
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [todayKey]);

  const currentLogForToday = useMemo((): DailyLog => {
    return config.log?.[todayKey] || {};
  }, [config.log, todayKey]);

  const completedTodayCount = useMemo(() => {
    return config.actions.filter(
      (action) => !!currentLogForToday[action.id]?.timestamp,
    ).length;
  }, [config.actions, currentLogForToday]);

  const handleToggleAction = useCallback(
    (actionId: string, dateKeyToUpdate: string = todayKey) => {
      const newConfig = JSON.parse(
        JSON.stringify(config),
      ) as HabitTrackerConfig; // Deep copy
      if (!newConfig.log) newConfig.log = {};
      if (!newConfig.log[dateKeyToUpdate]) newConfig.log[dateKeyToUpdate] = {};

      const existingEntry = newConfig.log[dateKeyToUpdate][actionId];

      if (existingEntry?.timestamp) {
        // Action was done, mark as not done (remove entry)
        delete newConfig.log[dateKeyToUpdate][actionId];
        const actionKeys = Object.keys(newConfig.log[dateKeyToUpdate]);
        if (actionKeys.length === 0) {
          delete newConfig.log[dateKeyToUpdate];
        }
      } else {
        // Action was not done, mark as done with current timestamp
        newConfig.log[dateKeyToUpdate][actionId] = {
          timestamp: new Date().toISOString(),
        };
      }
      onConfigChange?.(newConfig);
    },
    [config, onConfigChange, todayKey],
  );

  const openEditModal = (action: HabitAction, dateKeyToEdit: string) => {
    const logEntry = config.log?.[dateKeyToEdit]?.[action.id];
    setEditModalState({
      isOpen: true,
      actionId: action.id,
      actionName: action.name,
      dateKey: dateKeyToEdit,
      currentTimestamp: logEntry?.timestamp || new Date().toISOString(),
      currentNotes: logEntry?.notes || "",
    });
  };

  const handleSaveEditLog = () => {
    if (!editModalState.actionId) return;

    const newConfig = JSON.parse(JSON.stringify(config)) as HabitTrackerConfig;
    if (!newConfig.log) newConfig.log = {};
    if (!newConfig.log[editModalState.dateKey])
      newConfig.log[editModalState.dateKey] = {};

    // Ensure time is part of the timestamp if only date was picked
    let timestampToSave = editModalState.currentTimestamp;
    if (timestampToSave.length === 10) {
      // YYYY-MM-DD, implies date picker without time
      const now = new Date();
      timestampToSave = `${timestampToSave}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}Z`;
    } else if (!timestampToSave.includes("T")) {
      // Potentially just time, or malformed. Rebuild.
      const datePart = editModalState.dateKey;
      const timePart = editModalState.currentTimestamp; // Assuming this is HH:MM or similar
      const combinedDate = new Date(`${datePart}T${timePart}`);
      if (!isNaN(combinedDate.getTime())) {
        timestampToSave = combinedDate.toISOString();
      } else {
        // fallback to now on the selected date
        timestampToSave = new Date(
          editModalState.dateKey +
            "T" +
            new Date().toTimeString().split(" ")[0],
        ).toISOString();
      }
    }

    newConfig.log[editModalState.dateKey][editModalState.actionId] = {
      timestamp: timestampToSave,
      notes: editModalState.currentNotes.trim() || undefined,
    };
    onConfigChange?.(newConfig);
    setEditModalState({ ...editModalState, isOpen: false });
  };

  const handleClearLogEntryInModal = () => {
    if (!editModalState.actionId) return;
    const newConfig = JSON.parse(JSON.stringify(config)) as HabitTrackerConfig;
    if (newConfig.log?.[editModalState.dateKey]?.[editModalState.actionId]) {
      delete newConfig.log[editModalState.dateKey][editModalState.actionId];
      const actionKeys = Object.keys(newConfig.log[editModalState.dateKey]);
      if (actionKeys.length === 0) {
        delete newConfig.log[editModalState.dateKey];
      }
      onConfigChange?.(newConfig);
    }
    setEditModalState({ ...editModalState, isOpen: false });
  };

  const handleToggleHistory = () => {
    onConfigChange?.({ ...config, showHistory: !config.showHistory });
  };

  const historyDates = useMemo(
    () => getPastDateStrings(7, new Date(todayKey + "T00:00:00")),
    [todayKey],
  );

  const buttonBaseStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    marginRight: "4px",
    fontSize: "0.9em",
  };
  const actionButtonStyles: React.CSSProperties = {
    ...buttonBaseStyle,
    width: "30px",
    height: "30px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "5px",
  };

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle || "Habit Tracker"}
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
        {/* Daily Summary */}
        <div
          style={{
            marginBottom: "15px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
            🕓 {getFullDateLocaleString(todayKey)}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              ✅ {completedTodayCount} / {config.actions.length} actions
              completed
            </span>
          </div>
        </div>

        {/* Today's Actions List */}
        <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "10px" }}>
          {config.actions.length === 0 && (
            <p>No habits configured yet. Click settings to add some!</p>
          )}
          {config.actions.map((action) => {
            const logEntry = currentLogForToday[action.id];
            const isDone = !!logEntry?.timestamp;
            return (
              <div
                key={action.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <span style={{ marginRight: "8px", fontSize: "1.1em" }}>
                    {action.emoji}
                  </span>
                  <span>{action.name}</span>
                  {isDone && (
                    <span
                      style={{
                        fontSize: "0.8em",
                        color: "green",
                        marginLeft: "10px",
                      }}
                    >
                      ✅ Done at {formatTimeToLocale(logEntry.timestamp)}
                      {logEntry.notes && (
                        <em style={{ color: "#555", marginLeft: "5px" }}>
                          ({logEntry.notes})
                        </em>
                      )}
                    </span>
                  )}
                  {!isDone && (
                    <span
                      style={{
                        fontSize: "0.8em",
                        color: "#aaa",
                        marginLeft: "10px",
                      }}
                    >
                      ⏳ Not yet
                    </span>
                  )}
                </div>
                <div>
                  <button
                    title={isDone ? "Mark as Not Done" : "Mark as Done"}
                    onClick={() => handleToggleAction(action.id)}
                    style={{
                      ...actionButtonStyles,
                      color: isDone ? "#aaa" : "green",
                    }}
                  >
                    {isDone ? "↩️" : "✓"}
                  </button>
                  <button
                    title="Edit Log"
                    onClick={() => openEditModal(action, todayKey)}
                    style={actionButtonStyles}
                  >
                    ✎
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini-History View Toggle & Table */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: "10px" }}>
          <button
            onClick={handleToggleHistory}
            style={{
              ...buttonBaseStyle,
              marginBottom: "10px",
              width: "100%",
              background: "#f9f9f9",
            }}
          >
            📆 Mini-History (Past 7 Days){" "}
            {config.showHistory ? "⤴ Hide" : "⤵ Show"}
          </button>
          {config.showHistory && config.actions.length > 0 && (
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9em",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4px",
                        border: "1px solid #ddd",
                      }}
                    >
                      Date
                    </th>
                    {config.actions.map((action) => (
                      <th
                        key={action.id}
                        title={action.name}
                        style={{
                          textAlign: "center",
                          padding: "4px",
                          border: "1px solid #ddd",
                        }}
                      >
                        {action.emoji || action.name.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyDates.map((dateKey) => (
                    <tr key={dateKey}>
                      <td style={{ padding: "4px", border: "1px solid #ddd" }}>
                        {getDayShortName(dateKey)}
                        {dateKey !==
                          todayKey /* Add edit button for past days for quick logging */ && (
                          <button
                            title={`Edit ${getDayShortName(dateKey)}`}
                            onClick={() => {
                              /* For MVI, this is a bit extra; could open a specific day view or simplify */
                            }}
                            style={{
                              ...actionButtonStyles,
                              fontSize: "0.7em",
                              padding: "2px",
                              marginLeft: "3px",
                              visibility: "hidden",
                            }} // Hidden for now
                          >
                            ✎
                          </button>
                        )}
                      </td>
                      {config.actions.map((action) => {
                        const logEntry = config.log?.[dateKey]?.[action.id];
                        const isDone = !!logEntry?.timestamp;
                        return (
                          <td
                            key={action.id}
                            style={{
                              textAlign: "center",
                              padding: "4px",
                              border: "1px solid #ddd",
                              cursor: "pointer",
                            }}
                            title={
                              isDone
                                ? `${action.name} - Done at ${formatTimeToLocale(logEntry.timestamp)}${logEntry.notes ? " (" + logEntry.notes + ")" : ""}`
                                : `${action.name} - Not done`
                            }
                            onClick={() => openEditModal(action, dateKey)} // Click cell to edit
                          >
                            {isDone ? "✅" : dateKey > todayKey ? " " : "⏳"}{" "}
                            {/* Show nothing for future, ⏳ for past/today not done */}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {config.showHistory && config.actions.length === 0 && (
            <p style={{ fontSize: "0.9em", color: "#777" }}>
              Add some habits to see history.
            </p>
          )}
        </div>
      </div>

      {/* Edit Log Modal */}
      {editModalState.isOpen && editModalState.actionId && (
        <Modal
          isOpen={editModalState.isOpen}
          onClose={() =>
            setEditModalState({ ...editModalState, isOpen: false })
          }
          title={`Edit: ${editModalState.actionName || "Log Entry"} for ${getFullDateLocaleString(editModalState.dateKey)}`}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label htmlFor="logTimestampDate">Date:</label>
              <input
                type="date"
                id="logTimestampDate"
                value={editModalState.currentTimestamp.substring(0, 10)} // YYYY-MM-DD
                onChange={(e) => {
                  const timePart = editModalState.currentTimestamp.includes("T")
                    ? editModalState.currentTimestamp.substring(11)
                    : new Date().toTimeString().split(" ")[0];
                  setEditModalState({
                    ...editModalState,
                    currentTimestamp: `${e.target.value}T${timePart}`,
                  });
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label htmlFor="logTimestampTime">Time:</label>
              <input
                type="time"
                id="logTimestampTime"
                value={
                  editModalState.currentTimestamp.includes("T")
                    ? editModalState.currentTimestamp.substring(11, 16)
                    : new Date().toTimeString().substring(0, 5)
                } // HH:MM
                onChange={(e) => {
                  const datePart = editModalState.currentTimestamp.substring(
                    0,
                    10,
                  );
                  setEditModalState({
                    ...editModalState,
                    currentTimestamp: `${datePart}T${e.target.value}:00.000Z`,
                  }); // Assume Z for simplicity, actual TZ handling is complex
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label htmlFor="logNotes">Notes (optional):</label>
              <textarea
                id="logNotes"
                value={editModalState.currentNotes}
                onChange={(e) =>
                  setEditModalState({
                    ...editModalState,
                    currentNotes: e.target.value,
                  })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <button
                onClick={handleClearLogEntryInModal}
                style={{
                  ...buttonBaseStyle,
                  background: "#f44336",
                  color: "white",
                  border: "none",
                }}
              >
                Mark as Not Done / Clear
              </button>
              <div>
                <button
                  onClick={() =>
                    setEditModalState({ ...editModalState, isOpen: false })
                  }
                  style={{ ...buttonBaseStyle, marginRight: "10px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditLog}
                  style={{
                    ...buttonBaseStyle,
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </BaseWidget>
  );
};
