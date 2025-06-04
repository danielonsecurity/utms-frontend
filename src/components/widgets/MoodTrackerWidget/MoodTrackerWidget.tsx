import React, { useState, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget"; // Adjust path
import { WidgetProps } from "../../../widgets/registry"; // Adjust path
import { MoodTrackerConfig, Mood, MoodLogEntry } from "./types";
import {
  getISODateString,
  formatTimeToLocale,
  getFullDateLocaleString,
  getDayShortName,
  getPastDateStrings,
} from "../../../utils/dateUtils"; // Adjust path
import { Modal } from "../../common/Modal/Modal"; // Adjust path, assuming a Modal component exists

const getTodayKey = () => getISODateString(new Date());

interface LogMoodModalState {
  isOpen: boolean;
  editingEntry?: MoodLogEntry & { dateKey: string }; // If editing, this holds the entry
  // Fields for new or edited entry
  selectedMoodId: string;
  timestamp: string; // Full ISO string
  notes: string;
  targetDateKey: string; // YYYY-MM-DD for which date this log belongs
}

export const MoodTrackerWidget: React.FC<WidgetProps<MoodTrackerConfig>> = ({
  id,
  config,
  onRemove,
  onConfigChange,
  onWidgetConfigure,
}) => {
  const [todayKey, setTodayKey] = useState(getTodayKey());

  const [logModalState, setLogModalState] = useState<LogMoodModalState>({
    isOpen: false,
    selectedMoodId: config.moods[0]?.id || "",
    timestamp: new Date().toISOString(),
    notes: "",
    targetDateKey: todayKey,
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const newTodayKey = getTodayKey();
      if (newTodayKey !== todayKey) {
        setTodayKey(newTodayKey);
        // If modal was open for today, update its targetDateKey if it hasn't been set manually
        if (
          logModalState.isOpen &&
          logModalState.targetDateKey !== newTodayKey &&
          !logModalState.editingEntry
        ) {
          setLogModalState((prev) => ({
            ...prev,
            targetDateKey: newTodayKey,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [
    todayKey,
    logModalState.isOpen,
    logModalState.targetDateKey,
    logModalState.editingEntry,
  ]);

  const currentLogsForDate = useCallback(
    (dateKey: string): MoodLogEntry[] => {
      return (config.log?.[dateKey] || []).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    },
    [config.log],
  );

  const todayLogs = useMemo(
    () => currentLogsForDate(todayKey),
    [currentLogsForDate, todayKey],
  );

  const openAddMoodModal = (dateKeyToLog: string = todayKey) => {
    setLogModalState({
      isOpen: true,
      editingEntry: undefined,
      selectedMoodId: config.moods[0]?.id || "",
      timestamp: new Date(
        dateKeyToLog + "T" + new Date().toTimeString().split(" ")[0],
      ).toISOString(), // Set to current time on targetDateKey
      notes: "",
      targetDateKey: dateKeyToLog,
    });
  };

  const openEditMoodModal = (entry: MoodLogEntry, dateKey: string) => {
    setLogModalState({
      isOpen: true,
      editingEntry: { ...entry, dateKey },
      selectedMoodId: entry.moodId,
      timestamp: entry.timestamp,
      notes: entry.notes || "",
      targetDateKey: dateKey,
    });
  };

  const handleSaveMoodLog = () => {
    if (!logModalState.selectedMoodId && !logModalState.editingEntry) {
      // If no mood is selected (e.g., if default moods are empty and user hasn't selected one)
      // and it's not an edit operation (which implies a moodId already exists)
      alert("Please select a mood.");
      return;
    }

    const newConfig = JSON.parse(JSON.stringify(config)) as MoodTrackerConfig;
    if (!newConfig.log) newConfig.log = {};
    if (!newConfig.log[logModalState.targetDateKey]) {
      newConfig.log[logModalState.targetDateKey] = [];
    }

    const dateLog = newConfig.log[logModalState.targetDateKey];

    if (logModalState.editingEntry) {
      // Update existing entry
      const entryIndex = dateLog.findIndex(
        (e) => e.id === logModalState.editingEntry!.id,
      );
      if (entryIndex > -1) {
        dateLog[entryIndex] = {
          ...dateLog[entryIndex],
          moodId: logModalState.selectedMoodId,
          timestamp: logModalState.timestamp,
          notes: logModalState.notes.trim() || undefined,
        };
      }
    } else {
      // Add new entry
      const newEntry: MoodLogEntry = {
        id: crypto.randomUUID(),
        moodId: logModalState.selectedMoodId,
        timestamp: logModalState.timestamp,
        notes: logModalState.notes.trim() || undefined,
      };
      dateLog.push(newEntry);
    }

    onConfigChange?.(newConfig);
    setLogModalState({ ...logModalState, isOpen: false });
  };

  const handleDeleteMoodLog = (entryId: string, dateKey: string) => {
    const newConfig = JSON.parse(JSON.stringify(config)) as MoodTrackerConfig;
    if (newConfig.log?.[dateKey]) {
      newConfig.log[dateKey] = newConfig.log[dateKey].filter(
        (e) => e.id !== entryId,
      );
      if (newConfig.log[dateKey].length === 0) {
        delete newConfig.log[dateKey];
      }
      onConfigChange?.(newConfig);
    }
    // If modal was open for editing this entry, close it
    if (logModalState.isOpen && logModalState.editingEntry?.id === entryId) {
      setLogModalState({ ...logModalState, isOpen: false });
    }
  };

  const handleToggleHistory = () => {
    onConfigChange?.({ ...config, showHistory: !config.showHistory });
  };

  const historyDates = useMemo(
    () =>
      getPastDateStrings(7, new Date(todayKey + "T00:00:00")).filter(
        (d) => d !== todayKey,
      ), // Exclude today from history list
    [todayKey],
  );

  const getMoodById = (moodId: string): Mood | undefined => {
    return config.moods.find((m) => m.id === moodId);
  };

  const buttonBaseStyle: React.CSSProperties = {
    /* ... Same as HabitTracker ... */
  };
  const actionButtonStyles: React.CSSProperties = {
    /* ... Same as HabitTracker ... */
  };

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle || "Mood Tracker"}
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
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
            🗓️ {getFullDateLocaleString(todayKey)}
          </p>
          <button
            onClick={() => openAddMoodModal(todayKey)}
            style={{
              ...buttonBaseStyle,
              background: "#4CAF50",
              color: "white",
              border: "none",
              width: "100%",
              padding: "10px",
            }}
          >
            ＋ Log Current Mood
          </button>
        </div>

        <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "10px" }}>
          <h4 style={{ marginTop: 0 }}>Today's Moods ({todayLogs.length}):</h4>
          {config.moods.length === 0 && (
            <p>No moods configured. Add some in settings!</p>
          )}
          {config.moods.length > 0 && todayLogs.length === 0 && (
            <p>No moods logged for today yet.</p>
          )}
          {todayLogs.map((entry) => {
            const mood = getMoodById(entry.moodId);
            return (
              <div
                key={entry.id}
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
                    {mood?.emoji}
                  </span>
                  <span>{mood?.name || "Unknown Mood"}</span>
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: "#555",
                      marginLeft: "10px",
                    }}
                  >
                    @ {formatTimeToLocale(entry.timestamp)}
                    {entry.notes && (
                      <em style={{ color: "#777", marginLeft: "5px" }}>
                        ({entry.notes})
                      </em>
                    )}
                  </span>
                </div>
                <div>
                  <button
                    title="Edit Log"
                    onClick={() => openEditMoodModal(entry, todayKey)}
                    style={actionButtonStyles}
                  >
                    ✎
                  </button>
                  <button
                    title="Delete Log"
                    onClick={() => handleDeleteMoodLog(entry.id, todayKey)}
                    style={{ ...actionButtonStyles, color: "#f44336" }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
            📜 Mini-History (Past 7 Days){" "}
            {config.showHistory ? "⤴ Hide" : "⤵ Show"}
          </button>
          {config.showHistory && (
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              {historyDates.map((dateKey) => {
                const logsForDay = currentLogsForDate(dateKey);
                if (logsForDay.length === 0) return null; // Don't show day if no logs
                return (
                  <div key={dateKey} style={{ marginBottom: "10px" }}>
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontSize: "0.9em",
                      }}
                    >
                      {getFullDateLocaleString(dateKey)} (
                      {getDayShortName(dateKey)})
                    </strong>
                    {logsForDay.map((entry) => {
                      const mood = getMoodById(entry.moodId);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            fontSize: "0.85em",
                            paddingLeft: "10px",
                            marginBottom: "3px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            {mood?.emoji} {mood?.name} @{" "}
                            {formatTimeToLocale(entry.timestamp)}
                            {entry.notes && (
                              <em style={{ color: "#777", marginLeft: "5px" }}>
                                (
                                {entry.notes.length > 30
                                  ? entry.notes.substring(0, 27) + "..."
                                  : entry.notes}
                                )
                              </em>
                            )}
                          </span>
                          <div>
                            <button
                              title="Edit Log"
                              onClick={() => openEditMoodModal(entry, dateKey)}
                              style={{
                                ...actionButtonStyles,
                                fontSize: "0.8em",
                                padding: "2px 4px",
                                marginRight: "2px",
                              }}
                            >
                              ✎
                            </button>
                            <button
                              title="Delete Log"
                              onClick={() =>
                                handleDeleteMoodLog(entry.id, dateKey)
                              }
                              style={{
                                ...actionButtonStyles,
                                color: "#f44336",
                                fontSize: "0.8em",
                                padding: "2px 4px",
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {historyDates.every(
                (dateKey) => currentLogsForDate(dateKey).length === 0,
              ) &&
                config.moods.length > 0 && (
                  <p style={{ fontSize: "0.9em", color: "#777" }}>
                    No moods logged in the past 7 days.
                  </p>
                )}
              {config.moods.length === 0 && (
                <p style={{ fontSize: "0.9em", color: "#777" }}>
                  Add some moods to track and see history.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {logModalState.isOpen && (
        <Modal
          isOpen={logModalState.isOpen}
          onClose={() => setLogModalState({ ...logModalState, isOpen: false })}
          title={
            logModalState.editingEntry
              ? `Edit Mood Log for ${getFullDateLocaleString(logModalState.targetDateKey)}`
              : `Log Mood for ${getFullDateLocaleString(logModalState.targetDateKey)}`
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label htmlFor="moodSelect">Mood:</label>
              <select
                id="moodSelect"
                value={logModalState.selectedMoodId}
                onChange={(e) =>
                  setLogModalState({
                    ...logModalState,
                    selectedMoodId: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
                disabled={config.moods.length === 0}
              >
                {config.moods.length === 0 && (
                  <option value="">Please configure moods first</option>
                )}
                {config.moods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="logTimestampDate">Date:</label>
              <input
                type="date"
                id="logTimestampDate"
                value={logModalState.timestamp.substring(0, 10)}
                onChange={(e) => {
                  const timePart = logModalState.timestamp.includes("T")
                    ? logModalState.timestamp.substring(11)
                    : new Date().toTimeString().split(" ")[0];
                  const newDate = e.target.value;
                  setLogModalState({
                    ...logModalState,
                    timestamp: `${newDate}T${timePart}`,
                    targetDateKey: newDate,
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
                  logModalState.timestamp.includes("T")
                    ? logModalState.timestamp.substring(11, 16)
                    : new Date().toTimeString().substring(0, 5)
                }
                onChange={(e) => {
                  const datePart = logModalState.timestamp.substring(0, 10);
                  setLogModalState({
                    ...logModalState,
                    timestamp: `${datePart}T${e.target.value}:00.000Z`,
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
              <label htmlFor="logNotes">Notes (optional):</label>
              <textarea
                id="logNotes"
                value={logModalState.notes}
                onChange={(e) =>
                  setLogModalState({
                    ...logModalState,
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
              {logModalState.editingEntry && (
                <button
                  onClick={() =>
                    handleDeleteMoodLog(
                      logModalState.editingEntry!.id,
                      logModalState.editingEntry!.dateKey,
                    )
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
              {!logModalState.editingEntry && <div />}{" "}
              {/* Placeholder for alignment */}
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
                  onClick={handleSaveMoodLog}
                  style={{
                    ...buttonBaseStyle,
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                  }}
                  disabled={
                    config.moods.length === 0 && !logModalState.editingEntry
                  }
                >
                  {logModalState.editingEntry ? "Save Changes" : "Log Mood"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </BaseWidget>
  );
};
