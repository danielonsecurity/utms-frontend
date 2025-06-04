import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";

// --- Enums and Interfaces (defined earlier or imported) ---
export enum InterruptionType {
  DISTRACTION = "Distraction",
  EMERGENT_TASK = "Emergent Task",
  EXTERNAL = "External",
  INTERNAL = "Internal",
  SCHEDULED = "Scheduled",
  UNKNOWN = "Unknown",
}

export interface InterruptionEntry {
  id: string;
  description: string;
  startTime: number;
  endTime: number;
  types: InterruptionType[];
  impact: number; // 0 (minor) to 1 (severe)
  notes?: string;
}

export interface InterruptionLoggerConfig {
  name: string;
  interruptions: InterruptionEntry[];
  recentCauses: string[];
  maxRecentCauses: number;
}

// --- Helper Functions ---
const getDayBoundariesText = (date: Date | number): string => {
  return new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (ms: number): string => {
  if (ms < 0) ms = 0;
  if (ms === 0) return " instant";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let str = "";
  if (hours > 0) str += `${hours}h `;
  if (minutes > 0) str += `${minutes}m `;
  if (seconds > 0 || (hours === 0 && minutes === 0)) str += `${seconds}s`; // Show seconds if primary unit or duration is <1m

  return str.trim();
};

const toLocalISOString = (timestamp: number): string => {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

const ALL_INTERRUPTION_TYPES = Object.values(InterruptionType);

interface LogInterruptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (entryData: Omit<InterruptionEntry, "id" | "color">) => void; // color is not part of this entry
  recentCauses: string[];
  entryToEdit?: InterruptionEntry | null;
}

const LogInterruptionModal: React.FC<LogInterruptionModalProps> = ({
  isOpen,
  onClose,
  onLog,
  recentCauses,
  entryToEdit,
}) => {
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(toLocalISOString(Date.now()));
  const [endTime, setEndTime] = useState(toLocalISOString(Date.now()));
  const [types, setTypes] = useState<InterruptionType[]>([
    InterruptionType.DISTRACTION,
  ]);
  const [impact, setImpact] = useState(0.5);
  const [notes, setNotes] = useState("");
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entryToEdit) {
      setDescription(entryToEdit.description);
      setStartTime(toLocalISOString(entryToEdit.startTime));
      setEndTime(toLocalISOString(entryToEdit.endTime));
      setTypes(entryToEdit.types);
      setImpact(entryToEdit.impact);
      setNotes(entryToEdit.notes || "");
    } else {
      // Reset for new entry
      setDescription("");
      const nowStr = toLocalISOString(Date.now());
      setStartTime(nowStr);
      setEndTime(nowStr);
      setTypes([InterruptionType.DISTRACTION]);
      setImpact(0.5);
      setNotes("");
    }
  }, [entryToEdit, isOpen]); // Re-populate form when entryToEdit changes or modal re-opens

  useEffect(() => {
    if (isOpen && descriptionInputRef.current) {
      setTimeout(() => descriptionInputRef.current?.focus(), 0); // Focus after modal is rendered
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Description is required.");
      return;
    }
    const startTs = new Date(startTime).getTime();
    const endTs = new Date(endTime).getTime();
    if (endTs < startTs) {
      alert("End time cannot be before start time.");
      return;
    }

    onLog({
      description: description.trim(),
      startTime: startTs,
      endTime: endTs,
      types: types.length > 0 ? types : [InterruptionType.UNKNOWN],
      impact,
      notes: notes.trim() || undefined,
    });
    onClose(); // Modal will reset fields via useEffect on next open if not editing
  };

  const handleTypeChange = (type: InterruptionType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const impactLabels: { [key: number]: string } = {
    0: "Minor",
    0.25: "Low",
    0.5: "Medium",
    0.75: "High",
    1: "Severe",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "500px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
        }}
      >
        <h3>{entryToEdit ? "Edit" : "Log New"} Interruption</h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <div>
            <label htmlFor="int-description">
              Description (What interrupted you?):
            </label>
            <input
              ref={descriptionInputRef}
              id="int-description"
              type="text"
              list="recent-causes-datalist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
            <datalist id="recent-causes-datalist">
              {recentCauses.map((cause) => (
                <option key={cause} value={cause} />
              ))}
            </datalist>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="int-startTime">Start Time:</label>
              <input
                id="int-startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="int-endTime">End Time:</label>
              <input
                id="int-endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div>
            <label>Type(s):</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "5px",
              }}
            >
              {ALL_INTERRUPTION_TYPES.map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "0.9em",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={types.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    style={{ marginRight: "5px" }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="int-impact">
              Impact:{" "}
              {impactLabels[impact as keyof typeof impactLabels] ||
                impact.toFixed(2)}
            </label>
            <input
              id="int-impact"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={impact}
              onChange={(e) => setImpact(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8em",
              }}
            >
              <span>Minor</span>
              <span>Severe</span>
            </div>
          </div>
          <div>
            <label htmlFor="int-notes">Notes (Optional):</label>
            <textarea
              id="int-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                padding: "8px",
                boxSizing: "border-box",
                marginTop: "3px",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 15px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 15px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {entryToEdit ? "Save Changes" : "Log Interruption"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface InterruptionLoggerDisplayProps {
  config: InterruptionLoggerConfig;
  onConfigChange: (newConfig: InterruptionLoggerConfig) => void;
  widgetId: string;
}

const InterruptionLoggerDisplay: React.FC<InterruptionLoggerDisplayProps> = ({
  config,
  onConfigChange,
  widgetId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<InterruptionEntry | null>(
    null,
  );

  const handleLogInterruption = (entryData: Omit<InterruptionEntry, "id">) => {
    let updatedInterruptions;
    let updatedRecentCauses = [...config.recentCauses];

    if (entryToEdit) {
      updatedInterruptions = config.interruptions.map((i) =>
        i.id === entryToEdit.id ? { ...i, ...entryData } : i,
      );
    } else {
      const newEntry: InterruptionEntry = {
        ...entryData,
        id: `int-${widgetId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      updatedInterruptions = [newEntry, ...config.interruptions]; // Add to top for immediate visibility if sorted by time
    }

    // Update recent causes
    if (!updatedRecentCauses.includes(entryData.description)) {
      updatedRecentCauses.unshift(entryData.description); // Add to beginning
      if (updatedRecentCauses.length > config.maxRecentCauses) {
        updatedRecentCauses = updatedRecentCauses.slice(
          0,
          config.maxRecentCauses,
        );
      }
    }

    // Sort all interruptions again by start time, newest first
    updatedInterruptions.sort((a, b) => b.startTime - a.startTime);

    onConfigChange({
      ...config,
      interruptions: updatedInterruptions,
      recentCauses: updatedRecentCauses,
    });
    setEntryToEdit(null); // Clear edit state
  };

  const openEditModal = (entry: InterruptionEntry) => {
    setEntryToEdit(entry);
    setIsModalOpen(true);
  };

  const handleDeleteInterruption = (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this interruption log?")
    ) {
      onConfigChange({
        ...config,
        interruptions: config.interruptions.filter((i) => i.id !== id),
      });
    }
  };

  const groupedInterruptions = useMemo(() => {
    const groups: Record<string, InterruptionEntry[]> = {};
    // Interruptions are already sorted newest first by startTime in config
    config.interruptions.forEach((entry) => {
      const dateKey = getDayBoundariesText(entry.startTime);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry); // They will be in descending startTime order within the day
    });
    return groups;
  }, [config.interruptions]);

  // Get sorted date keys (most recent day first)
  const sortedDateKeys = useMemo(
    () =>
      Object.keys(groupedInterruptions).sort(
        (a, b) =>
          new Date(groupedInterruptions[b][0].startTime).getTime() -
          new Date(groupedInterruptions[a][0].startTime).getTime(),
      ),
    [groupedInterruptions],
  );

  const getImpactColor = (impactValue: number): string => {
    const hue = (1 - impactValue) * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "10px",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <button
        onClick={() => {
          setEntryToEdit(null);
          setIsModalOpen(true);
        }}
        style={{
          position: "absolute",
          top: "8px",
          right: "40px", // Adjust if BaseWidget has other buttons
          padding: "8px",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          fontSize: "20px",
          lineHeight: "20px",
          cursor: "pointer",
          zIndex: 10,
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
        title="Log New Interruption"
      >
        +
      </button>

      <LogInterruptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEntryToEdit(null);
        }}
        onLog={handleLogInterruption}
        recentCauses={config.recentCauses}
        entryToEdit={entryToEdit}
      />

      <div style={{ flexGrow: 1, overflowY: "auto", marginTop: "10px" }}>
        {config.interruptions.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777", marginTop: "30px" }}>
            No interruptions logged yet. Click the '+' to add one.
          </p>
        ) : (
          sortedDateKeys.map((dateKey) => (
            <div key={dateKey} style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  margin: "0 0 8px 0",
                  paddingBottom: "5px",
                  borderBottom: "1px solid #ddd",
                  color: "#333",
                }}
              >
                {dateKey}
              </h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9em",
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    <th style={{ padding: "5px 2px" }}>Time</th>
                    <th style={{ padding: "5px 2px" }}>Description</th>
                    <th style={{ padding: "5px 2px" }}>Duration</th>
                    <th style={{ padding: "5px 2px" }}>Type(s)</th>
                    <th style={{ padding: "5px 2px", textAlign: "center" }}>
                      Impact
                    </th>
                    <th style={{ padding: "5px 2px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedInterruptions[dateKey].map((entry) => (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: "1px dashed #eee" }}
                    >
                      <td style={{ padding: "6px 2px", whiteSpace: "nowrap" }}>
                        {formatTimestamp(entry.startTime)}
                      </td>
                      <td
                        style={{ padding: "6px 2px", wordBreak: "break-word" }}
                        title={
                          entry.notes
                            ? `Notes: ${entry.notes}`
                            : entry.description
                        }
                      >
                        {entry.description}
                      </td>
                      <td style={{ padding: "6px 2px", whiteSpace: "nowrap" }}>
                        {formatDuration(entry.endTime - entry.startTime)}
                      </td>
                      <td style={{ padding: "6px 2px", fontSize: "0.85em" }}>
                        {entry.types.join(", ")}
                      </td>
                      <td style={{ padding: "6px 2px", textAlign: "center" }}>
                        <div
                          title={`Impact: ${(entry.impact * 100).toFixed(0)}%`}
                          style={{
                            width: "80%",
                            height: "10px",
                            backgroundColor: getImpactColor(entry.impact),
                            margin: "auto",
                            borderRadius: "3px",
                            border: "1px solid #ccc",
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 2px", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => openEditModal(entry)}
                          style={{
                            marginRight: "5px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteInterruption(entry.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: "red",
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const InterruptionLoggerWidget: React.FC<
  WidgetProps<InterruptionLoggerConfig>
> = ({ id, config, onRemove, onWidgetConfigure, onConfigChange }) => {
  return (
    <BaseWidget
      id={id}
      title={config.name}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <InterruptionLoggerDisplay
        config={config}
        onConfigChange={onConfigChange}
        widgetId={id}
      />
    </BaseWidget>
  );
};
