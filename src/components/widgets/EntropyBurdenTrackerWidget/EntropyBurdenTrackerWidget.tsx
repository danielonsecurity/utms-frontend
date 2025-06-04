// entropyBurdenTracker/EntropyBurdenTrackerWidget.tsx
import React, { useState, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget"; // Adjust path
import { WidgetProps } from "../../../widgets/registry"; // Adjust path
import {
  EntropyBurdenTrackerConfig,
  EntropyBurden,
  BurdenActionLogEntry,
  EnergyLevel,
  EmotionalLoadEmoji,
} from "./types";
import { Modal } from "../../common/Modal/Modal"; // Adjust path
import {
  getISODateString,
  formatTimeToLocale,
  getFullDateLocaleString,
} from "../../../utils/dateUtils"; // Adjust path

// Options for selects - could be moved to a constants file or shared with config editor
const ENERGY_LEVELS_LOG: EnergyLevel[] = ["Low", "Medium", "High", "Very High"];
const MOOD_OPTIONS_LOG: EmotionalLoadEmoji[] = [
  "😊",
  "🙂",
  "😐",
  "😟",
  "😩",
  "🤯",
];

interface LogInteractionModalState {
  isOpen: boolean;
  burdenId: string | null;
  burdenName?: string;
  // Fields for new log entry
  notes: string;
  energyExpended: EnergyLevel;
  entropyChange: number; // Slider value from -1 to +1, step 0.1
  moodAfter: EmotionalLoadEmoji;
}

const getDaysAgo = (isoTimestamp?: string): string => {
  if (!isoTimestamp) return "Never";
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
};

export const EntropyBurdenTrackerWidget: React.FC<
  WidgetProps<EntropyBurdenTrackerConfig>
> = ({ id, config, onRemove, onConfigChange, onWidgetConfigure }) => {
  const [logModalState, setLogModalState] = useState<LogInteractionModalState>({
    isOpen: false,
    burdenId: null,
    notes: "",
    energyExpended: "Medium",
    entropyChange: -0.1, // Default to a small reduction
    moodAfter: "😐",
  });

  // TODO: Add sorting/filtering state if needed
  // const [sortBy, setSortBy] = useState<'entropy' | 'lastTouched' | 'name'>('entropy');

  const openLogModal = (burden: EntropyBurden) => {
    setLogModalState({
      isOpen: true,
      burdenId: burden.id,
      burdenName: burden.name,
      notes: "",
      energyExpended: burden.energyToEngage || "Medium", // Pre-fill with typical energy
      entropyChange: -0.1, // Sensible default
      moodAfter: burden.emotionalLoad || "😐", // Pre-fill
    });
  };

  const handleSaveLog = () => {
    if (!logModalState.burdenId) return;

    const newEntry: BurdenActionLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      notes: logModalState.notes.trim() || undefined,
      energyExpended: logModalState.energyExpended,
      entropyChange: logModalState.entropyChange,
      moodAfter: logModalState.moodAfter,
    };

    const updatedBurdens = config.burdens.map((b) => {
      if (b.id === logModalState.burdenId) {
        const newEntropy = Math.max(
          0,
          Math.min(1, b.currentEntropyLevel + newEntry.entropyChange),
        );
        return {
          ...b,
          log: [newEntry, ...b.log].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ), // Add to log and re-sort
          lastTouchedTimestamp: newEntry.timestamp,
          currentEntropyLevel: newEntropy,
        };
      }
      return b;
    });

    onConfigChange?.({ ...config, burdens: updatedBurdens });
    setLogModalState({ ...logModalState, isOpen: false }); // Reset modal
  };

  // Placeholder for chart component
  const EntropyChart = ({ burden }: { burden: EntropyBurden }) => {
    if (burden.log.length < 2)
      return (
        <p style={{ fontSize: "0.8em", color: "#777" }}>
          Not enough data for a chart yet.
        </p>
      );
    // This would be a more complex component using a charting library (e.g., Recharts, Chart.js)
    // It would map burden.log entries and burden.creationTimestamp + initial entropy
    // to plot entropyLevel over time.
    return (
      <div
        style={{
          height: "100px",
          background: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          marginTop: "10px",
        }}
      >
        <p style={{ color: "#999" }}>Entropy Chart for {burden.name} (WIP)</p>
      </div>
    );
  };

  const sortedBurdens = useMemo(() => {
    // Example sort: highest entropy first, then by last touched (oldest first)
    return [...config.burdens].sort((a, b) => {
      if (b.currentEntropyLevel !== a.currentEntropyLevel) {
        return b.currentEntropyLevel - a.currentEntropyLevel;
      }
      const aTime = a.lastTouchedTimestamp
        ? new Date(a.lastTouchedTimestamp).getTime()
        : 0;
      const bTime = b.lastTouchedTimestamp
        ? new Date(b.lastTouchedTimestamp).getTime()
        : 0;
      if (aTime === 0 && bTime !== 0) return 1; // a never touched, b touched -> a after b
      if (bTime === 0 && aTime !== 0) return -1; // b never touched, a touched -> b after a
      return aTime - bTime; // oldest touched first
    });
  }, [config.burdens]);

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
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Add controls for sorting/filtering here if desired */}
        {config.burdens.length === 0 && (
          <p style={{ textAlign: "center", color: "#777", marginTop: "20px" }}>
            No burdens defined. Add some in settings!
          </p>
        )}
        <div
          style={{
            flexGrow: 1,
            overflowY: "auto",
            paddingRight: "5px" /* for scrollbar */,
          }}
        >
          {sortedBurdens.map((burden) => (
            <div
              key={burden.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "15px",
                background: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {burden.name}
                <span
                  style={{
                    fontSize: "0.8em",
                    fontWeight: "normal",
                    color:
                      burden.currentEntropyLevel > 0.7
                        ? "red"
                        : burden.currentEntropyLevel < 0.3
                          ? "green"
                          : "#555",
                  }}
                >
                  Entropy: {(burden.currentEntropyLevel * 100).toFixed(0)}%
                </span>
              </h4>
              {burden.description && (
                <p
                  style={{
                    fontSize: "0.9em",
                    color: "#555",
                    margin: "0 0 10px 0",
                  }}
                >
                  {burden.description}
                </p>
              )}

              <div
                style={{
                  fontSize: "0.8em",
                  color: "#777",
                  marginBottom: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "15px",
                }}
              >
                <span>
                  Last touched:{" "}
                  <strong>{getDaysAgo(burden.lastTouchedTimestamp)}</strong>
                </span>
                {burden.energyToEngage && (
                  <span>
                    Energy: <strong>{burden.energyToEngage}</strong>
                  </span>
                )}
                {burden.emotionalLoad && (
                  <span>
                    Load: <strong>{burden.emotionalLoad}</strong>
                  </span>
                )}
                {burden.importance && (
                  <span>
                    Importance: <strong>{burden.importance}</strong>
                  </span>
                )}
                {burden.decayRate && (
                  <span>
                    Decay: <strong>{burden.decayRate}</strong>
                  </span>
                )}
              </div>
              {burden.tags && burden.tags.length > 0 && (
                <div style={{ fontSize: "0.75em", marginBottom: "10px" }}>
                  {burden.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#eee",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        marginRight: "5px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => openLogModal(burden)}
                style={{
                  padding: "8px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Log Interaction / Update
              </button>

              {/* Placeholder for future chart integration */}
              <EntropyChart burden={burden} />

              {/* Optionally show last few log entries directly on card */}
              {burden.log.length > 0 && (
                <div style={{ marginTop: "10px", fontSize: "0.8em" }}>
                  <strong style={{ display: "block", marginBottom: "3px" }}>
                    Recent Activity:
                  </strong>
                  {burden.log.slice(0, 2).map(
                    (
                      entry, // Show last 2
                    ) => (
                      <div
                        key={entry.id}
                        style={{
                          borderTop: "1px dashed #eee",
                          paddingTop: "5px",
                          marginTop: "5px",
                        }}
                      >
                        <span>
                          {getFullDateLocaleString(
                            entry.timestamp.substring(0, 10),
                          )}{" "}
                          ({formatTimeToLocale(entry.timestamp)}):{" "}
                        </span>
                        {entry.notes && <em>"{entry.notes}" </em>}
                        <span
                          style={{
                            color:
                              entry.entropyChange < 0
                                ? "green"
                                : entry.entropyChange > 0
                                  ? "red"
                                  : "inherit",
                          }}
                        >
                          Entropy Δ: {entry.entropyChange.toFixed(1)}
                        </span>
                        {entry.moodAfter && (
                          <span>, Mood: {entry.moodAfter}</span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {logModalState.isOpen && logModalState.burdenId && (
        <Modal
          isOpen={logModalState.isOpen}
          onClose={() => setLogModalState({ ...logModalState, isOpen: false })}
          title={`Log Interaction: ${logModalState.burdenName || "Burden"}`}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label htmlFor="logNotes">What did you do? (optional)</label>
              <textarea
                id="logNotes"
                rows={3}
                value={logModalState.notes}
                onChange={(e) =>
                  setLogModalState({ ...logModalState, notes: e.target.value })
                }
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div>
                <label htmlFor="logEnergy">Energy Expended:</label>
                <select
                  id="logEnergy"
                  value={logModalState.energyExpended}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      energyExpended: e.target.value as EnergyLevel,
                    })
                  }
                  style={{ width: "100%", padding: "8px" }}
                >
                  {ENERGY_LEVELS_LOG.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="logMood">Mood After:</label>
                <select
                  id="logMood"
                  value={logModalState.moodAfter}
                  onChange={(e) =>
                    setLogModalState({
                      ...logModalState,
                      moodAfter: e.target.value as EmotionalLoadEmoji,
                    })
                  }
                  style={{ width: "100%", padding: "8px" }}
                >
                  {MOOD_OPTIONS_LOG.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="logEntropyChange">
                Entropy Change: {logModalState.entropyChange.toFixed(1)}{" "}
                (Negative = progress)
              </label>
              <input
                type="range"
                id="logEntropyChange"
                min="-1"
                max="1"
                step="0.1"
                value={logModalState.entropyChange}
                onChange={(e) =>
                  setLogModalState({
                    ...logModalState,
                    entropyChange: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  setLogModalState({ ...logModalState, isOpen: false })
                }
                style={{ padding: "8px 12px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLog}
                style={{
                  padding: "8px 12px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                }}
              >
                Save Log
              </button>
            </div>
          </div>
        </Modal>
      )}
    </BaseWidget>
  );
};
