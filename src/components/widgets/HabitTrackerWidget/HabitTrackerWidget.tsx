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
  getDateStringDaysAgo,
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

const getDaysSinceLastOccurrence = (
  actionId: string,
  log: HabitTrackerConfig["log"],
  currentDateKey: string,
): number | null => {
  let daysSince = 0;
  let dateToCheck = currentDateKey;

  // Check today first. If logged today, streak is 0 (or -1 to indicate failure today)
  if (log[dateToCheck]?.[actionId]?.timestamp) {
    return -1; // Special value indicating relapse today
  }

  // Iterate backwards from yesterday
  for (let i = 1; i < 365 * 5; i++) {
    // Check up to 5 years back, adjust as needed
    dateToCheck = getDateStringDaysAgo(currentDateKey, i);
    if (log[dateToCheck]?.[actionId]?.timestamp) {
      return i; // Found last occurrence i days ago
    }
  }
  return null; // No occurrence found in the checked range (long streak or never done)
};

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
  const isHabitOverdue = useCallback(
    (
      action: HabitAction,
      currentLog: HabitTrackerConfig["log"],
      currentDateKey: string,
    ): boolean => {
      const maxSkip = action.maxSkipDays ?? 0; // Default to 0 (daily) if undefined

      // Check from today (0 days ago) up to maxSkip days ago.
      // If a log is found in this (maxSkip + 1)-day window, it's not overdue.
      for (let i = 0; i <= maxSkip; i++) {
        const dateToCheck = getDateStringDaysAgo(currentDateKey, i);
        if (currentLog[dateToCheck]?.[action.id]?.timestamp) {
          return false; // Found a log within the allowed window
        }
      }
      return true; // Not found within the allowed window, so it's overdue
    },
    [],
  );

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
      const action = config.actions.find((a) => a.id === actionId);
      if (!action) return;

      const newConfig = JSON.parse(
        JSON.stringify(config),
      ) as HabitTrackerConfig;
      if (!newConfig.log) newConfig.log = {};
      if (!newConfig.log[dateKeyToUpdate]) newConfig.log[dateKeyToUpdate] = {};

      const existingEntry = newConfig.log[dateKeyToUpdate][actionId];

      if (existingEntry?.timestamp) {
        // Action was done/relapsed, mark as not done/clear relapse
        delete newConfig.log[dateKeyToUpdate][actionId];
        // ... (cleanup empty date log as before)
      } else {
        // Action was not done / no relapse, mark as done / log relapse
        newConfig.log[dateKeyToUpdate][actionId] = {
          timestamp: new Date().toISOString(), // Use current time for relapse
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
    () => getPastDateStrings(7, new Date(todayKey + "T00:00:00Z")), // Ensure using Z for UTC consistency if getPastDateStrings assumes local
    [todayKey],
  );

  const getHistoryDateColumnHeader = (dateKey: string) => {
    if (dateKey === todayKey) return "Today";
    return getDayShortName(dateKey);
  };

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
            const isDoneOrRelapsedToday = !!logEntry?.timestamp;

            let statusDisplay;
            let buttonIcon = isDoneOrRelapsedToday ? "↩️" : "✓"; // Default for positive
            let buttonTitle = isDoneOrRelapsedToday
              ? "Mark as Not Done"
              : "Mark as Done";
            let buttonColor = isDoneOrRelapsedToday ? "#aaa" : "green";

            if (action.isNegative) {
              buttonIcon = isDoneOrRelapsedToday ? "↩️" : "❌"; // "Log Relapse" vs "Clear Relapse"
              buttonTitle = isDoneOrRelapsedToday
                ? "Clear Relapse (Mistake)"
                : "Log Relapse";
              buttonColor = isDoneOrRelapsedToday ? "green" : "#f44336"; // Green to clear, Red to log relapse

              if (isDoneOrRelapsedToday) {
                statusDisplay = (
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: "red",
                      marginLeft: "10px",
                    }}
                  >
                    😫 Relapsed at {formatTimeToLocale(logEntry.timestamp)}
                    {logEntry.notes && (
                      <em style={{ color: "#555" }}> ({logEntry.notes})</em>
                    )}
                  </span>
                );
              } else {
                const daysSince = getDaysSinceLastOccurrence(
                  action.id,
                  config.log,
                  todayKey,
                );
                if (daysSince === null) {
                  statusDisplay = (
                    <span
                      style={{
                        fontSize: "0.8em",
                        color: "green",
                        marginLeft: "10px",
                      }}
                    >
                      🎉 Great job! Keep it up!
                    </span>
                  );
                } else if (daysSince === -1) {
                  // Should be caught by isDoneOrRelapsedToday, but for safety
                  statusDisplay = /* already handled */ null;
                } else {
                  statusDisplay = (
                    <span
                      style={{
                        fontSize: "0.8em",
                        color: "green",
                        marginLeft: "10px",
                      }}
                    >
                      👍 {daysSince} day{daysSince === 1 ? "" : "s"} streak!
                    </span>
                  );
                }
              }
            } else {
              // Positive Habit
              const showOverdueWarning =
                !isDoneOrRelapsedToday &&
                isHabitOverdue(action, config.log, todayKey);
              buttonColor = isDoneOrRelapsedToday
                ? "#aaa"
                : showOverdueWarning
                  ? "orange"
                  : "green";

              if (isDoneOrRelapsedToday) {
                statusDisplay = (
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: "green",
                      marginLeft: "10px",
                    }}
                  >
                    ✅ Done at {formatTimeToLocale(logEntry.timestamp)}
                    {logEntry.notes && (
                      <em style={{ color: "#555" }}> ({logEntry.notes})</em>
                    )}
                  </span>
                );
              } else if (showOverdueWarning) {
                statusDisplay = (
                  <span
                    style={{
                      fontSize: "1.1em",
                      color: "orange",
                      marginLeft: "10px",
                    }}
                    title={`Overdue! Due every ${(action.maxSkipDays ?? 0) + 1} day(s).`}
                  >
                    ⚠️
                  </span>
                );
              } else {
                statusDisplay = (
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: "#aaa",
                      marginLeft: "10px",
                    }}
                  >
                    ⏳ Not yet
                  </span>
                );
              }
            }
            return (
              <div
                key={action.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                  borderLeft: action.isNegative
                    ? "2px solid red"
                    : "2px solid green",
                }}
              >
                <div
                  style={{ flexGrow: 1, display: "flex", alignItems: "center" }}
                >
                  <span style={{ marginRight: "8px", fontSize: "1.1em" }}>
                    {action.emoji}
                  </span>
                  <span>{action.name}</span>
                  {statusDisplay}
                </div>

                <div>
                  <button
                    title={buttonTitle}
                    onClick={() => handleToggleAction(action.id)}
                    style={{ ...actionButtonStyles, color: buttonColor }}
                  >
                    {buttonIcon}
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
              {" "}
              {/* Adjust maxHeight as needed */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9em",
                  tableLayout: "fixed", // Helps with column widths
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4px",
                        border: "1px solid #ddd",
                        width: "100px", // Adjust width for habit name column
                        minWidth: "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Habit
                    </th>
                    {/* Columns are now dates */}
                    {historyDates.map((dateKey) => (
                      <th
                        key={dateKey}
                        title={getFullDateLocaleString(dateKey)}
                        style={{
                          textAlign: "center",
                          padding: "4px",
                          border: "1px solid #ddd",
                          width: "40px", // Adjust for date columns
                        }}
                      >
                        {getHistoryDateColumnHeader(dateKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Rows are now habits */}
                  {config.actions.map((action) => (
                    <tr key={action.id}>
                      <td /* Habit name cell */>
                        {action.isNegative && (
                          <span
                            title="Habit to Avoid"
                            style={{ color: "red", marginRight: "3px" }}
                          >
                            ❗
                          </span>
                        )}
                        {action.emoji} {action.name}
                      </td>
                      {historyDates.map((dateKey) => {
                        const logEntry = config.log?.[dateKey]?.[action.id];
                        const isDoneOrRelapsed = !!logEntry?.timestamp;
                        const isFutureDate = dateKey > todayKey;

                        let cellContent = " ";
                        let cellTitle = `${action.name} - Future Date`;
                        let cellStyleUpdate: React.CSSProperties = {};

                        if (action.isNegative) {
                          if (isDoneOrRelapsed) {
                            cellContent = "❌"; // Relapsed
                            cellTitle = `${action.name} - Relapsed on ${getFullDateLocaleString(dateKey)} at ${formatTimeToLocale(logEntry.timestamp)}`;
                            cellStyleUpdate.background = "#ffdddd"; // Light red
                          } else if (!isFutureDate) {
                            cellContent = "👍"; // Avoided
                            cellTitle = `${action.name} - Avoided on ${getFullDateLocaleString(dateKey)}`;
                            cellStyleUpdate.background = "#e6ffe6"; // Light green
                          }
                        } else {
                          // Positive Habit
                          if (isDoneOrRelapsed) {
                            cellContent = "✅";
                            cellTitle = `${action.name} - Done at ${formatTimeToLocale(logEntry.timestamp)}`;
                            cellStyleUpdate.background = "#e6ffe6";
                          } else if (!isFutureDate) {
                            cellContent = "⏳";
                            cellTitle = `${action.name} - Not done on ${getFullDateLocaleString(dateKey)}`;
                          }
                        }

                        return (
                          <td
                            key={`${action.id}-${dateKey}`}
                            style={{
                              textAlign: "center",
                              padding: "4px",
                              border: "1px solid #ddd",
                              cursor: "pointer",
                              ...cellStyleUpdate,
                            }}
                            title={cellTitle}
                            onClick={() => openEditModal(action, dateKey)}
                          >
                            {cellContent}
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
