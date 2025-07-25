import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import { SleepTrackerConfig, SleepLogEntry } from "./types";
import {
  getISODateString,
  formatTimeForInput,
  calculateSleepDuration,
  calidadEmojis,
  calidadTooltips,
} from "./sleepUtils";
import { getPastDateStrings } from "../../../utils/dateUtils";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity } from "../../../types/entities";

const todayKey = () => getISODateString(new Date());
const yesterdayKey = () => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return getISODateString(y);
};

const qualityOptions = [1, 2, 3, 4, 5];

const calculateDurationFromISO = (
  startISO?: string,
  endISO?: string,
): SleepDuration | null => {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO);
  // ... rest of the logic from calculateSleepDuration ...
  const diffMs = end.getTime() - start.getTime();
  if (isNaN(diffMs) || diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, totalMinutes, displayText: `${hours}h ${minutes}m` };
};

const SleepLogTable: React.FC<{
  logs: any[];
}> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#777", marginTop: "20px" }}>
        No sleep entries logged yet.
      </p>
    );
  }

  const tableHeaderStyle: React.CSSProperties = {
    background: "#f0f0f0",
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
  };
  const tableCellStyle: React.CSSProperties = {
    padding: "8px",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h4 style={{ margin: "0 0 10px 0" }}>Sleep Log History</h4>
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          border: "1px solid #ddd",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Sleep</th>
              <th style={tableHeaderStyle}>Wake</th>
              <th style={tableHeaderStyle}>Duration</th>
              <th style={tableHeaderStyle}>Quality</th>
              <th style={tableHeaderStyle}>Notes</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const duration = calculateDurationFromISO(
                log.start_time,
                log.end_time,
              );
              const startDate = new Date(log.start_time);

              // Create a reverse map for quality display if needed
              const qualityReverseMap: { [key: string]: number } = {
                bad: 1,
                poor: 2,
                okay: 3,
                good: 4,
                great: 5,
              };
              const qualityNumber =
                qualityReverseMap[log.metadata?.quality] || 3;
              return (
                <tr key={index}>
                  <td style={tableCellStyle}>
                    {startDate.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={tableCellStyle}>
                    {startDate.toLocaleTimeString()}
                  </td>
                  <td style={tableCellStyle}>
                    {new Date(log.end_time).toLocaleTimeString()}
                  </td>
                  <td style={tableCellStyle}>{duration?.displayText || "-"}</td>
                  <td
                    style={tableCellStyle}
                    title={calidadTooltips[qualityNumber]}
                  >
                    {calidadEmojis[qualityNumber]}
                  </td>
                  <td
                    style={tableCellStyle}
                    title={calidadTooltips[log.quality]}
                  >
                    {calidadEmojis[log.quality]}
                  </td>
                  <td
                    style={{
                      ...tableCellStyle,
                      whiteSpace: "pre-wrap",
                      fontSize: "0.9em",
                    }}
                  >
                    {log.notes || "-"}
                  </td>
                  <td style={tableCellStyle}>
                    <button
                      onClick={() => onEditEntry(log.date)}
                      style={{
                        ...buttonBaseStyle,
                        marginRight: "5px",
                        fontSize: "0.8em",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteEntry(log.date)}
                      style={{
                        ...buttonBaseStyle,
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        fontSize: "0.8em",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const buttonBaseStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #ccc",
  borderRadius: "4px",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "0.9em",
};

export const SleepTrackerWidget: React.FC<WidgetProps<SleepTrackerConfig>> = ({
  id,
  config,
  onRemove,
  onConfigChange,
  onWidgetConfigure,
}) => {
  const [habitEntity, setHabitEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [sleepStart, setSleepStart] = useState<string>("");
  const [sleepEnd, setSleepEnd] = useState<string>("");
  const [quality, setQuality] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    const fetchHabitData = async () => {
      try {
        setIsLoading(true);
        const data = await entitiesApi.getEntity("habit", "sleep", "Sleep");
        setHabitEntity(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch sleep habit:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHabitData();
  }, []);

  const isCurrentlySleeping = useMemo(
    () => !!habitEntity?.attributes.active-occurrence-start-time?.value,
    [habitEntity],
  );

  const occurrences = useMemo(
    () =>
      (habitEntity?.attributes.occurrences?.value || []).sort(
        (a: any, b: any) =>
          new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
      ),
    [habitEntity],
  );

  const activeSleepStartTime = useMemo(
    () => habitEntity?.attributes.active-occurrence-start-time?.value,
    [habitEntity],
  );

  const qualityMap: { [key: number]: string } = {
    1: "bad",
    2: "poor",
    3: "okay",
    4: "good",
    5: "great",
  };

  const handleToggleSleepState = async () => {
    const entityType = "habit";
    const category = "sleep";
    const name = "Sleep";

    // Show a loading indicator if you have one
    // setIsLoading(true);

    try {
      let updatedEntity;
      if (isCurrentlySleeping) {
        // Waking up
        const payload = {
          notes: "Auto-logged from wake up button.",
          metadata: {
            quality: qualityMap[3], // Default to 'okay' for now
          },
        };
        updatedEntity = await entitiesApi.endOccurrence(
          entityType,
          category,
          name,
          payload,
        );
      } else {
        // Going to sleep
        updatedEntity = await entitiesApi.startOccurrence(
          entityType,
          category,
          name,
        );
      }
      // Update local state with the authoritative response from the server
      setHabitEntity(updatedEntity);
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      // setIsLoading(false);
    }
  };

  const handleEditLogEntry = (date: string) => {
    setSelectedDate(date); // This will trigger the useEffect to load the form
    // Scroll to form if needed, or highlight the form
  };

  const handleDeleteLogEntry = (dateToDelete: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the sleep log for ${new Date(dateToDelete + "T00:00:00").toLocaleDateString()}?`,
      )
    ) {
      const updatedLogs = config.logs.filter(
        (log) => log.date !== dateToDelete,
      );
      onConfigChange?.({ ...config, logs: updatedLogs });
      // If the deleted entry was the one in the form, clear the form or load another entry
      if (selectedDate === dateToDelete) {
        setSelectedDate(todayKey()); // or load the latest entry, or clear form
      }
    }
  };

  const existingEntryForSelectedDate = useMemo(() => {
    return config.logs.find((log) => log.date === selectedDate);
  }, [config.logs, selectedDate]);

  useEffect(() => {
    if (existingEntryForSelectedDate) {
      setSleepStart(
        formatTimeForInput(existingEntryForSelectedDate.sleepStart),
      ); // Ensure this uses the new formatter too
      setSleepEnd(formatTimeForInput(existingEntryForSelectedDate.sleepEnd)); // And this one
      setQuality(existingEntryForSelectedDate.quality);
      setNotes(existingEntryForSelectedDate.notes || "");
      setIsDirty(false);
    } else {
      if (selectedDate === todayKey() && !isCurrentlySleeping) {
        // Don't autofill if currently sleeping
        const now = new Date();
        const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
        setSleepStart(formatTimeForInput(eightHoursAgo)); // Use formatter
        setSleepEnd(formatTimeForInput(now)); // Use formatter
      } else if (!isCurrentlySleeping) {
        // For past dates or if not currently sleeping
        setSleepStart("23:00");
        setSleepEnd("07:00");
      } else {
        // If currently sleeping and selectedDate is today, form might be blank or show "in progress"
        setSleepStart(""); // Or some indicator
        setSleepEnd(""); // Or some indicator
      }
      setQuality(3);
      setNotes("");
      setIsDirty(true);
    }
  }, [selectedDate, existingEntryForSelectedDate, isCurrentlySleeping]); // Added isCurrentlySleeping

  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<any>>,
    value: any,
  ) => {
    setter(value);
    setIsDirty(true);
  };

  const handleSaveLog = useCallback(() => {
    if (!sleepStart || !sleepEnd) {
      alert("Please enter both sleep start and end times.");
      return;
    }

    const newEntry: SleepLogEntry = {
      date: selectedDate,
      sleepStart, // Already HH:MM
      sleepEnd, // Already HH:MM
      quality,
      notes: notes.trim() || undefined,
    };

    let updatedLogs: SleepLogEntry[];
    if (existingEntryForSelectedDate) {
      updatedLogs = config.logs.map((log) =>
        log.date === selectedDate ? newEntry : log,
      );
    } else {
      updatedLogs = [...config.logs, newEntry];
    }

    // Keep logs sorted by date descending
    updatedLogs.sort((a, b) => b.date.localeCompare(a.date));

    onConfigChange?.({ ...config, logs: updatedLogs });
    setIsDirty(false);
    // Optionally, move to next logical date or stay
  }, [
    selectedDate,
    sleepStart,
    sleepEnd,
    quality,
    notes,
    config,
    onConfigChange,
    existingEntryForSelectedDate,
  ]);

  const duration = useMemo(() => {
    return calculateSleepDuration(selectedDate, sleepStart, sleepEnd);
  }, [selectedDate, sleepStart, sleepEnd]);

  // --- UI Styles (can be moved to a separate const or CSS) ---
  const formRowStyle: React.CSSProperties = {
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
  };
  const labelStyle: React.CSSProperties = {
    marginBottom: "4px",
    fontSize: "0.9em",
    fontWeight: "500",
  };
  const inputStyle: React.CSSProperties = {
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1em",
  };
  const qualityButtonStyle = (
    q: number,
    selected: boolean,
  ): React.CSSProperties => ({
    padding: "8px 12px",
    margin: "0 4px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1.2em",
    background: selected ? "var(--accent-color, #007bff)" : "#f0f0f0",
    color: selected ? "white" : "black",
  });
  const buttonStyle: React.CSSProperties = {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    background: "#4CAF50",
    color: "white",
    fontSize: "1em",
  };

  // === TIMELINE SUMMARY SECTION (Placeholder for now) ===
  const TimelineSummary = () => {
    const pastLogs = useMemo(() => {
      const datesToDisplay = getPastDateStrings(
        config.displayDaysInTimeline,
        new Date(selectedDate + "T00:00:00"),
      );
      return datesToDisplay
        .map((dateStr) => {
          const log = config.logs.find((l) => l.date === dateStr);
          return { date: dateStr, log };
        })
        .reverse(); // Show oldest first for typical timeline
    }, [config.logs, config.displayDaysInTimeline, selectedDate]);

    if (pastLogs.length === 0 && config.logs.length > 0) {
      // This case might happen if selectedDate is far in past
      return <p>No recent logs to display around the selected date.</p>;
    }
    if (config.logs.length === 0) {
      return <p>Log some sleep to see the timeline!</p>;
    }

    const timelineHeight = 200; // px
    const barWidthPercentage = 100 / config.displayDaysInTimeline;

    return (
      <div
        style={{
          marginTop: "20px",
          borderTop: "1px solid #eee",
          paddingTop: "15px",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0" }}>
          Sleep Timeline ({config.displayDaysInTimeline} Days)
        </h4>
        <div
          style={{
            display: "flex",
            height: `${timelineHeight}px`,
            border: "1px solid #ddd",
            position: "relative",
            background: "#f9f9f9",
            overflowX: "auto",
          }}
        >
          {/* Y-Axis Labels (Optional, could be complex to align perfectly) */}
          {/* Example:
                <div style={{position: 'absolute', left: '-30px', top: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.7em'}}>
                    <span>12 PM</span><span>6 PM</span><span>12 AM</span><span>6 AM</span><span>12 PM (Next Day)</span>
                </div>
                */}

          {pastLogs.map(({ date, log }) => {
            let sleepBlock = null;
            if (log) {
              const start = new Date(`${log.date}T${log.sleepStart}`);
              let end = new Date(`${log.date}T${log.sleepEnd}`);
              if (end < start) end.setDate(end.getDate() + 1);

              const dayStartHour = 12; // Timeline starts at 12 PM previous day for a good visual range

              // Total span of the Y-axis in hours (e.g., 12 PM to 12 PM next day = 24 hours, or more if needed)
              // Let's represent a 24h slot, from 12:00 (midday) of the log.date to 12:00 of log.date+1
              // This way we can see evening sleeps and morning wake-ups well.
              // A bar's 0% top is 12:00 of log.date. 100% bottom is 12:00 of log.date+1.

              const timelineWindowStart = new Date(`${log.date}T12:00:00`); // Start Y-axis at noon
              const timelineWindowMs = 24 * 60 * 60 * 1000; // 24-hour window

              const offsetMs = start.getTime() - timelineWindowStart.getTime();
              const durationMs = end.getTime() - start.getTime();

              if (durationMs > 0) {
                const topPercentage = (offsetMs / timelineWindowMs) * 100;
                const heightPercentage = (durationMs / timelineWindowMs) * 100;

                const qualityColor =
                  log.quality === 1
                    ? "#ff6b6b"
                    : log.quality === 2
                      ? "#ffa07a"
                      : log.quality === 3
                        ? "#ffd700"
                        : log.quality === 4
                          ? "#90ee90"
                          : "#87cefa";

                sleepBlock = (
                  <div
                    title={`${log.sleepStart} - ${log.sleepEnd} (${calculateSleepDuration(log.date, log.sleepStart, log.sleepEnd)?.displayText})\nQuality: ${calidadTooltips[log.quality]}`}
                    style={{
                      position: "absolute",
                      top: `${Math.max(0, Math.min(100, topPercentage))}%`, // Clamp within bounds
                      height: `${Math.max(0, Math.min(100 - topPercentage, heightPercentage))}%`, // Clamp
                      width: "80%",
                      left: "10%",
                      background: qualityColor,
                      borderRadius: "3px",
                      minHeight: "2px", // visible even for short sleeps
                    }}
                  ></div>
                );
              }
            }
            return (
              <div
                key={date}
                style={{
                  width: `${barWidthPercentage}%`,
                  borderRight: "1px solid #eee",
                  position: "relative",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                {sleepBlock}
                <span
                  style={{
                    fontSize: "0.7em",
                    padding: "2px 0",
                    background: "#f0f0f0",
                    width: "100%",
                  }}
                >
                  {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <BaseWidget
        id={id}
        title="Loading..."
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <p style={{ padding: "20px", textAlign: "center" }}>
          Loading sleep data...
        </p>
      </BaseWidget>
    );
  }
  if (error) {
    return (
      <BaseWidget
        id={id}
        title="Error"
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <p style={{ padding: "20px", color: "red" }}>Error: {error}</p>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            marginBottom: "15px",
          }}
        >
          <button
            onClick={handleToggleSleepState}
            style={{
              ...buttonStyle, // Use your existing buttonStyle or create a new one
              width: "100%",
              marginBottom: "15px",
              background: isCurrentlySleeping ? "#FFC107" : "#0288D1", // Yellow for "Wake Up", Blue for "Sleep"
              color: "white",
            }}
          >
            {isCurrentlySleeping
              ? `😴 Currently Sleeping... (Tap to Log Wake Up)`
              : `🛌 Go to Sleep (Tap to Start Timer)`}
          </button>
          {isCurrentlySleeping && activeSleepStartTime && (
            <p
              style={{
                textAlign: "center",
                fontSize: "0.8em",
                margin: "-10px 0 10px 0",
                color: "#555",
              }}
            >
              Sleep started at:{" "}
              {new Date(activeSleepStartTime).toLocaleTimeString()}
            </p>
          )}
          <div
            style={{ borderBottom: "1px solid #eee", paddingBottom: "10px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <label
                htmlFor={`${id}-date-selector`}
                style={{ ...labelStyle, marginBottom: 0, fontWeight: "normal" }}
              >
                Log for Date:
              </label>
              <input
                type="date"
                id={`${id}-date-selector`}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ ...inputStyle, padding: "6px", flexGrow: 1 }}
              />
            </div>
          </div>
          <div style={formRowStyle}>
            <label htmlFor={`${id}-sleepStart`} style={labelStyle}>
              🛌 Sleep Start:
            </label>
            <input
              type="time"
              id={`${id}-sleepStart`}
              style={inputStyle}
              value={sleepStart}
              onChange={(e) => handleInputChange(setSleepStart, e.target.value)}
            />
          </div>
          <div style={formRowStyle}>
            <label htmlFor={`${id}-sleepEnd`} style={labelStyle}>
              ☀️ Wake Time:
            </label>
            <input
              type="time"
              id={`${id}-sleepEnd`}
              style={inputStyle}
              value={sleepEnd}
              onChange={(e) => handleInputChange(setSleepEnd, e.target.value)}
            />
          </div>
          {duration && (
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9em" }}>
              Duration: <strong>{duration.displayText}</strong>
            </p>
          )}

          <div style={formRowStyle}>
            <label style={labelStyle}>😴 Quality:</label>
            <div style={{ display: "flex" }}>
              {qualityOptions.map((q) => (
                <button
                  key={q}
                  title={calidadTooltips[q]}
                  style={qualityButtonStyle(q, quality === q)}
                  onClick={() => handleInputChange(setQuality, q)}
                >
                  {calidadEmojis[q]}
                </button>
              ))}
            </div>
          </div>
          <div style={formRowStyle}>
            <label htmlFor={`${id}-notes`} style={labelStyle}>
              💬 Notes (optional):
            </label>
            <textarea
              id={`${id}-notes`}
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
              value={notes}
              onChange={(e) => handleInputChange(setNotes, e.target.value)}
            />
          </div>
          <button
            style={{
              ...buttonStyle,
              width: "100%",
              background: isDirty ? "#4CAF50" : "#ccc",
            }}
            onClick={handleSaveLog}
            disabled={!isDirty}
          >
            {existingEntryForSelectedDate && !isDirty
              ? "Saved"
              : existingEntryForSelectedDate
                ? "Update Log"
                : "Save Log"}
          </button>
        </div>

        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          <TimelineSummary />
          {/* Optional Sleep Duration Graph can be added here later */}
          <SleepLogTable
            logs={occurrences} // Already sorted by date descending from sanitizeConfig/handleSaveLog
            onEditEntry={handleEditLogEntry}
            onDeleteEntry={handleDeleteLogEntry}
          />
        </div>
      </div>
    </BaseWidget>
  );
};
