import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";
import {
  getDailyLog,
  switchContext as apiSwitchContext,
} from "./ContextSwitcherApiService";

// --- Interfaces (no change from previous) ---
export interface ContextEntry {
  id: string;
  name: string;
  startTime: number; // timestamp
  endTime: number | null; // timestamp, null if ongoing
  color: string;
}

export interface ContextSwitcherConfig {
  name: string;
  contexts: ContextEntry[];
  contextColors: Record<string, string>; // Map context name to a color
  colorPalette: string[];
  nextColorIndex: number;
}

// --- Helper Functions (some modifications) ---
const getDayBoundaries = (date: Date | number) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const startOfDayMs = d.getTime();
  d.setHours(23, 59, 59, 999);
  const endOfDayMs = d.getTime();
  return { startOfDayMs, endOfDayMs, dateObj: new Date(startOfDayMs) };
};

const formatDuration = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let str = "";
  if (hours > 0) str += `${hours}h `;
  if (minutes > 0 || hours > 0) str += `${minutes}m `;
  if (hours === 0 && minutes < 5 && totalSeconds > 0) str += `${seconds}s`; // Show seconds for short non-zero durations

  return str.trim() || (ms > 0 ? "<1s" : "0s");
};

const toLocalISOString = (timestamp: number | null): string => {
  if (timestamp === null) return "";
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

interface EditEntryModalProps {
  entry: ContextEntry | null;
  onClose: () => void;
  onSave: (updatedEntry: ContextEntry) => void;
  allContextNames: string[];
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  onClose,
  onSave,
  allContextNames,
}) => {
  const [name, setName] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setStartTimeStr(toLocalISOString(entry.startTime));
      setIsOngoing(entry.endTime === null);
      if (entry.endTime !== null) {
        setEndTimeStr(toLocalISOString(entry.endTime));
      } else {
        setEndTimeStr("");
      }
    }
  }, [entry]);

  if (!entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStartTime = new Date(startTimeStr).getTime();
    let newEndTime: number | null = null;
    if (!isOngoing && endTimeStr) {
      newEndTime = new Date(endTimeStr).getTime();
      if (newEndTime <= newStartTime) {
        alert("End time must be after start time.");
        return;
      }
    } else if (!isOngoing && !endTimeStr) {
      alert("End time is required if not ongoing.");
      return;
    }

    onSave({
      ...entry,
      name: name.trim(),
      startTime: newStartTime,
      endTime: newEndTime,
      // Color will be reassigned if name changes and it's a new name
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "350px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
      >
        <h3>Edit Context Entry</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label
              htmlFor="edit-name"
              style={{ display: "block", marginBottom: "3px" }}
            >
              Name:
            </label>
            <input
              id="edit-name"
              type="text"
              list="context-names-datalist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
            <datalist id="context-names-datalist">
              {allContextNames.map((cn) => (
                <option key={cn} value={cn} />
              ))}
            </datalist>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label
              htmlFor="edit-startTime"
              style={{ display: "block", marginBottom: "3px" }}
            >
              Start Time:
            </label>
            <input
              id="edit-startTime"
              type="datetime-local"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="edit-endTime"
              style={{ display: "block", marginBottom: "3px" }}
            >
              End Time:
            </label>
            <input
              id="edit-endTime"
              type="datetime-local"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              disabled={isOngoing}
              style={{
                width: "100%",
                padding: "8px",
                boxSizing: "border-box",
                backgroundColor: isOngoing ? "#eee" : "white",
              }}
            />
            <div style={{ marginTop: "5px" }}>
              <input
                type="checkbox"
                id="edit-isOngoing"
                checked={isOngoing}
                onChange={(e) => setIsOngoing(e.target.checked)}
              />
              <label htmlFor="edit-isOngoing" style={{ marginLeft: "5px" }}>
                Ongoing
              </label>
            </div>
          </div>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 15px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 15px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ContextSwitcherDisplayProps {
  config: ContextSwitcherConfig;
  onConfigChange: (newConfig: ContextSwitcherConfig) => void;
  widgetId: string;
}

const ContextSwitcherDisplay: React.FC<ContextSwitcherDisplayProps> = ({
  config,
  onConfigChange,
  widgetId,
}) => {
  const [contexts, setContexts] = useState<ContextEntry[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<
    Record<string, ContextEntry[]>
  >({});
  // Add loading and error states for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newContextName, setNewContextName] = useState("");
  const [editingEntry, setEditingEntry] = useState<ContextEntry | null>(null);
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());

  // Timeline zoom/pan state (simplified for now)
  const [viewStartOffsetHours, setViewStartOffsetHours] = useState(0); // e.g., 0 for midnight
  const [viewDurationHours, setViewDurationHours] = useState(24); // e.g., 24 for full day

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragInitialOffsetHours, setDragInitialOffsetHours] = useState(0);

  useEffect(() => {
    const fetchLogForDay = async () => {
      const dateStr = currentDisplayDate.toISOString().split("T")[0];

      // Don't re-fetch if we already have the data for this day
      if (historicalLogs[dateStr]) {
        setContexts(historicalLogs[dateStr]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const entries = await getDailyLog(currentDisplayDate);
        // Set the timeline context for the currently viewed day
        setContexts(entries);
        // Add the newly fetched entries to our historical log
        setHistoricalLogs((prevLogs) => ({
          ...prevLogs,
          [dateStr]: entries,
        }));
      } catch (e) {
        setError("Could not load context data.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogForDay();
  }, [currentDisplayDate, historicalLogs]);

  const switchContext = async () => {
    if (!newContextName.trim()) {
      alert("Please enter a context name.");
      return;
    }

    const trimmedName = newContextName.trim();
    setNewContextName("");

    try {
      const updatedContextsForToday = await apiSwitchContext(trimmedName);

      // Ensure the timeline displays today's date after a switch
      const today = new Date();
      if (
        currentDisplayDate.toISOString().split("T")[0] !==
        today.toISOString().split("T")[0]
      ) {
        setCurrentDisplayDate(today);
      }

      // Update the timeline state
      setContexts(updatedContextsForToday);

      // Update the historical log state for today
      const todayStr = today.toISOString().split("T")[0];
      setHistoricalLogs((prevLogs) => ({
        ...prevLogs,
        [todayStr]: updatedContextsForToday,
      }));
    } catch (e) {
      alert("Error switching context. Please try again.");
      console.error(e);
    }
  };

  const handleSaveEditedEntry = (updatedEntry: ContextEntry) => {
    let newContexts = config.contexts.map((c) =>
      c.id === updatedEntry.id ? updatedEntry : c,
    );
    let newContextColors = { ...config.contextColors };
    let newNextColorIndex = config.nextColorIndex;

    // If name changed and it's a new name, assign color. If name changed to existing, use its color.
    const originalEntry = config.contexts.find((c) => c.id === updatedEntry.id);
    if (originalEntry && originalEntry.name !== updatedEntry.name) {
      if (newContextColors[updatedEntry.name]) {
        updatedEntry.color = newContextColors[updatedEntry.name];
      } else {
        updatedEntry.color =
          config.colorPalette[newNextColorIndex % config.colorPalette.length];
        newContextColors[updatedEntry.name] = updatedEntry.color;
        newNextColorIndex = newNextColorIndex + 1;
      }
    }

    // Ensure no overlaps: This is complex. For simplicity, we'll just sort.
    // A more robust solution would check for overlaps and prevent/resolve them.
    newContexts.sort((a, b) => a.startTime - b.startTime);

    // Adjust adjacent entries if necessary (e.g., if an entry is made ongoing)
    if (updatedEntry.endTime === null) {
      newContexts = newContexts.map((c) => {
        if (
          c.id !== updatedEntry.id &&
          c.startTime >= updatedEntry.startTime &&
          c.endTime !== null
        ) {
          // This is a naive way, could lead to data loss if not careful
          // Ideally, prompt user or split entries. For now, just make sure it's not active.
          // Or better: prevent making an entry ongoing if subsequent entries exist.
          // For now, we'll allow it and the sort order should mostly handle it.
          // The display logic will then need to be robust.
        }
        return c;
      });
    }

    onConfigChange({
      ...config,
      contexts: newContexts,
      contextColors: newContextColors,
      nextColorIndex: newNextColorIndex,
    });
    setEditingEntry(null);
  };

  const { startOfDayMs: currentDayStartMs, endOfDayMs: currentDayEndMs } =
    useMemo(() => {
      return getDayBoundaries(currentDisplayDate);
    }, [currentDisplayDate]);

  // Timeline display range based on zoom/pan
  const timelineViewStartMs =
    currentDayStartMs + viewStartOffsetHours * 3600 * 1000;
  const timelineViewEndMs =
    timelineViewStartMs + viewDurationHours * 3600 * 1000;
  const totalTimelineViewDuration = timelineViewEndMs - timelineViewStartMs;

  const contextsForCurrentTimelineView = useMemo(() => {
    return config.contexts
      .filter((c) => {
        // Entry overlaps with the current timeline view window
        const entryEnd = c.endTime === null ? Date.now() : c.endTime;
        return (
          c.startTime < timelineViewEndMs && entryEnd > timelineViewStartMs
        );
      })
      .map((c) => {
        const displayStartTime = Math.max(c.startTime, timelineViewStartMs);
        const displayEndTime =
          c.endTime === null
            ? Math.min(Date.now(), timelineViewEndMs)
            : Math.min(c.endTime, timelineViewEndMs);
        return { ...c, displayStartTime, displayEndTime };
      })
      .filter((c) => c.displayEndTime > c.displayStartTime)
      .sort((a, b) => a.startTime - b.startTime);
  }, [contexts, timelineViewStartMs, timelineViewEndMs]);

  const allContextsFromHistory = useMemo(() => {
    return Object.values(historicalLogs)
      .flat()
      .sort((a, b) => a.startTime - b.startTime);
  }, [historicalLogs]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, ContextEntry[]> = {};
    allContextsFromHistory.forEach((c) => {
      const dateKey = new Date(c.startTime).toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(c);
    });
    // Sort entries within each group by start time (already sorted in config.contexts but good for safety)
    for (const key in groups) {
      groups[key].sort((a, b) => a.startTime - b.startTime);
    }
    return groups;
  }, [allContextsFromHistory]);

  const sortedDateKeys = useMemo(
    () =>
      Object.keys(groupedLogs).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    [groupedLogs],
  );

  const deleteContext = (id: string) => {
    // ... (deleteContext logic remains the same)
    if (!window.confirm("Are you sure you want to delete this context entry?"))
      return;

    let updatedContexts = config.contexts.filter((c) => c.id !== id);
    const deletedEntry = config.contexts.find((c) => c.id === id);

    if (
      deletedEntry &&
      deletedEntry.endTime === null &&
      updatedContexts.length > 0
    ) {
      const entriesBeforeDeleted = updatedContexts
        .filter((c) => c.startTime < deletedEntry.startTime)
        .sort((a, b) => b.startTime - a.startTime);

      if (entriesBeforeDeleted.length > 0) {
        const previousEntry = entriesBeforeDeleted[0];
        // If previous entry ended very close to when deleted one started, make it ongoing
        if (deletedEntry.startTime - (previousEntry.endTime || 0) < 10000) {
          // within 10s
          updatedContexts = updatedContexts.map((c) =>
            c.id === previousEntry.id ? { ...c, endTime: null } : c,
          );
        }
      }
    }
    updatedContexts.sort((a, b) => a.startTime - b.startTime);
    onConfigChange({ ...config, contexts: updatedContexts });
  };
  const allContextNames = useMemo(() => {
    const names = new Set<string>();
    // CHANGE this to get names from all history, giving better suggestions
    allContextsFromHistory.forEach((c) => names.add(c.name));
    if (newContextName.trim()) names.add(newContextName.trim());
    return Array.from(names).sort();
  }, [allContextsFromHistory, newContextName]);

  const changeDisplayDate = (offset: number) => {
    const newDate = new Date(currentDisplayDate);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDisplayDate(newDate);
    setViewStartOffsetHours(0); // Reset zoom/pan when changing day
    setViewDurationHours(24);
  };

  // --- Zoom and Pan Handlers (Basic Implementation) ---
  const handleZoom = (factor: number) => {
    // factor > 1 zooms in, < 1 zooms out
    const centerPointRatio = 0.5; // Zoom around the center of the current view
    const currentCenterTime =
      timelineViewStartMs + totalTimelineViewDuration * centerPointRatio;

    let newDurationHours = viewDurationHours / factor;
    newDurationHours = Math.max(1, Math.min(24 * 7, newDurationHours)); // Min 1hr, Max 1 week view

    let newStartOffsetHours =
      (currentCenterTime -
        newDurationHours * 0.5 * 3600 * 1000 -
        currentDayStartMs) /
      (3600 * 1000);

    // Keep view within reasonable bounds (e.g., not too far before/after currentDayStartMs for a single day view)
    // This needs refinement if spanning multiple days in timeline view
    newStartOffsetHours = Math.max(-12, Math.min(36, newStartOffsetHours)); // Allow some spill but not infinite

    setViewDurationHours(newDurationHours);
    setViewStartOffsetHours(newStartOffsetHours);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragInitialOffsetHours(viewStartOffsetHours);
    e.currentTarget.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineContainerRef.current) return;
    const dx = e.clientX - dragStartX;
    const containerWidth = timelineContainerRef.current.offsetWidth;
    const hoursDragged = (dx / containerWidth) * viewDurationHours; // How many hours the drag represents

    let newOffset = dragInitialOffsetHours - hoursDragged;
    // Clamp panning within reasonable limits (e.g., for a single day view)
    // This limit depends on whether you want the timeline to pan beyond the currentDisplayDate
    // const minOffset = -viewDurationHours +1; // Can't pan left more than almost a full view
    // const maxOffset = 24 -1; // Can't pan right more than almost a full day view
    // newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

    setViewStartOffsetHours(newOffset);
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      if (e.currentTarget) e.currentTarget.style.cursor = "grab";
    }
  };

  const timelineTicks = useMemo(() => {
    const ticks = [];
    const numTicks =
      viewDurationHours <= 3
        ? 24
        : viewDurationHours <= 6
          ? 12
          : viewDurationHours <= 12
            ? 6
            : 4; // More ticks when zoomed in
    const hourInterval = Math.max(1, Math.floor(viewDurationHours / numTicks));

    for (let i = 0; i <= viewDurationHours; i += hourInterval) {
      const tickTime = timelineViewStartMs + i * 3600 * 1000;
      // Check if tickTime is on an "even" hour relative to timelineViewStartMs's hour
      const startHour = new Date(timelineViewStartMs).getHours();
      const tickHour = new Date(tickTime).getHours();

      if (
        (tickHour - startHour + 24) % hourInterval === 0 ||
        i === 0 ||
        i === viewDurationHours
      ) {
        ticks.push({
          time: tickTime,
          label: new Date(tickTime).toLocaleTimeString([], {
            hour: "numeric",
            minute: viewDurationHours < 6 ? "2-digit" : undefined,
          }),
          positionPercent: (i / viewDurationHours) * 100,
        });
      }
    }
    // Ensure last tick is always present if not perfectly divisible
    if (ticks.length === 0 || ticks[ticks.length - 1].positionPercent < 99) {
      ticks.push({
        time: timelineViewEndMs,
        label: new Date(timelineViewEndMs).toLocaleTimeString([], {
          hour: "numeric",
          minute: viewDurationHours < 6 ? "2-digit" : undefined,
        }),
        positionPercent: 100,
      });
    }
    return ticks.filter(
      (t) => t.positionPercent >= 0 && t.positionPercent <= 100,
    );
  }, [timelineViewStartMs, timelineViewEndMs, viewDurationHours]);

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
      {/* --- Input Section (same as before) --- */}
      <div style={{ display: "flex", marginBottom: "10px" }}>
        <input
          type="text"
          value={newContextName}
          list="context-names-datalist-main"
          onChange={(e) => setNewContextName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && switchContext()}
          placeholder="Switching to..."
          style={{
            flexGrow: 1,
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px 0 0 4px",
          }}
        />
        <datalist id="context-names-datalist-main">
          {allContextNames.map((cn) => (
            <option key={cn} value={cn} />
          ))}
        </datalist>
        <button
          onClick={switchContext}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "1px solid #4CAF50",
            borderLeft: "none",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
          }}
        >
          Switch
        </button>
      </div>

      {/* --- Timeline Section --- */}
      <div
        style={{
          marginBottom: "5px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "0.9em", color: "#555" }}>
          Timeline for:
          <button
            onClick={() => changeDisplayDate(-1)}
            style={{ margin: "0 5px" }}
          >
            &lt;
          </button>{" "}
          {/* Fixed here */}
          <strong
            style={{
              display: "inline-block",
              minWidth: "120px",
              textAlign: "center",
            }}
          >
            {currentDisplayDate.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </strong>
          <button
            onClick={() => changeDisplayDate(1)}
            style={{ margin: "0 5px" }}
          >
            &gt;
          </button>{" "}
          {/* Optionally fixed here */}
        </div>
        <div>
          <button
            onClick={() => handleZoom(1.5)}
            title="Zoom In"
            style={{ marginRight: "5px" }}
          >
            +
          </button>
          <button onClick={() => handleZoom(1 / 1.5)} title="Zoom Out">
            -
          </button>
        </div>
      </div>
      <div
        ref={timelineContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{
          display: "flex",
          width: "100%",
          height: "40px",
          backgroundColor: "#e9e9e9",
          borderRadius: "4px",
          overflow: "hidden",
          border: "1px solid #ddd",
          position: "relative",
          cursor: "grab",
          userSelect: "none", // Prevent text selection during drag
        }}
      >
        {contextsForCurrentTimelineView.length === 0 && (
          <div
            style={{
              width: "100%",
              textAlign: "center",
              lineHeight: "40px",
              color: "#888",
            }}
          >
            No contexts tracked for this time range.
          </div>
        )}
        {contextsForCurrentTimelineView.map((context, index) => {
          const segmentStartTimeInView = Math.max(
            context.displayStartTime,
            timelineViewStartMs,
          );
          const segmentEndTimeInView = Math.min(
            context.displayEndTime,
            timelineViewEndMs,
          );
          const durationInView = segmentEndTimeInView - segmentStartTimeInView;

          if (durationInView <= 0) return null;

          const widthPercent =
            totalTimelineViewDuration > 0
              ? (durationInView / totalTimelineViewDuration) * 100
              : 0;
          const leftPercent =
            totalTimelineViewDuration > 0
              ? ((segmentStartTimeInView - timelineViewStartMs) /
                  totalTimelineViewDuration) *
                100
              : 0;

          const actualDuration =
            (context.endTime || Date.now()) - context.startTime;

          return (
            <div
              key={context.id}
              title={`${context.name} (${formatDuration(actualDuration)}\n${new Date(context.startTime).toLocaleTimeString()} - ${context.endTime ? new Date(context.endTime).toLocaleTimeString() : "Now"})`}
              style={{
                position: "absolute",
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                height: "100%",
                backgroundColor: context.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRight:
                  index < contextsForCurrentTimelineView.length - 1 &&
                  widthPercent < 99
                    ? "1px solid rgba(0,0,0,0.1)"
                    : "none",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "white",
                  textShadow: "0 0 2px rgba(0,0,0,0.7)",
                  whiteSpace: "nowrap",
                  padding: "0 3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {widthPercent > (context.name.length > 10 ? 15 : 5)
                  ? context.name
                  : ""}{" "}
                {/* Show name if segment is wide enough */}
              </span>
            </div>
          );
        })}
        {/* Timeline Ticks */}
        {timelineTicks.map((tick) => (
          <div
            key={tick.time}
            style={{
              position: "absolute",
              left: `${tick.positionPercent}%`,
              top: "100%",
              transform: "translateX(-50%)",
              fontSize: "9px",
              color: "#555",
              paddingTop: "2px",
            }}
          >
            {tick.label}
          </div>
        ))}
        {/* "Now" line if current time is within the view */}
        {Date.now() >= timelineViewStartMs &&
          Date.now() <= timelineViewEndMs && (
            <div
              style={{
                position: "absolute",
                left: `${((Date.now() - timelineViewStartMs) / totalTimelineViewDuration) * 100}%`,
                top: 0,
                bottom: 0,
                width: "2px",
                backgroundColor: "rgba(255,0,0,0.7)",
                zIndex: 1,
              }}
              title={`Now: ${new Date().toLocaleTimeString()}`}
            ></div>
          )}
      </div>
      <div style={{ height: "15px" }}> {/* Spacer for ticks */} </div>

      {/* --- Log Section (Grouped by Day) --- */}
      <div
        style={{
          marginTop: "10px",
          flexGrow: 1,
          overflowY: "auto",
          fontSize: "0.85em",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0" }}>Context Log:</h4>
        {sortedDateKeys.length === 0 && (
          <p style={{ color: "#777" }}>No entries yet.</p>
        )}
        {sortedDateKeys.map((dateKey) => (
          <div key={dateKey} style={{ marginBottom: "15px" }}>
            <h5
              style={{
                margin: "0 0 5px 0",
                paddingBottom: "3px",
                borderBottom: "1px solid #ddd",
                color: "#333",
              }}
            >
              {dateKey}{" "}
              {new Date(dateKey).getTime() ===
              getDayBoundaries(new Date()).startOfDayMs
                ? "(Today)"
                : ""}
            </h5>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {groupedLogs[dateKey]
                .slice()
                .reverse()
                .map(
                  (
                    c, // slice().reverse() to show newest first for the day
                  ) => (
                    <li
                      key={c.id + "-log"}
                      style={{
                        padding: "5px 2px",
                        borderBottom: "1px dashed #eee",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "10px",
                          height: "10px",
                          backgroundColor: c.color,
                          borderRadius: "3px",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span
                        style={{
                          fontWeight: "bold",
                          minWidth: "100px",
                          flexBasis: "150px",
                          flexGrow: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                      <span style={{ color: "#555", flexShrink: 0 }}>
                        {new Date(c.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {c.endTime ? (
                          new Date(c.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span style={{ color: "green", fontWeight: "bold" }}>
                            Ongoing
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          color: "#777",
                          fontStyle: "italic",
                          flexShrink: 0,
                          minWidth: "50px",
                          textAlign: "right",
                        }}
                      >
                        (
                        {formatDuration(
                          (c.endTime || Date.now()) - c.startTime,
                        )}
                        )
                      </span>
                      <button
                        onClick={() => setEditingEntry(c)}
                        title="Edit"
                        style={{
                          padding: "2px 5px",
                          fontSize: "10px",
                          background: "none",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          cursor: "pointer",
                          marginLeft: "5px",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteContext(c.id)}
                        title="Delete"
                        style={{
                          padding: "2px 5px",
                          fontSize: "10px",
                          background: "none",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          cursor: "pointer",
                          color: "red",
                        }}
                      >
                        🗑️
                      </button>
                    </li>
                  ),
                )}
            </ul>
          </div>
        ))}
      </div>

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEditedEntry}
          allContextNames={allContextNames}
        />
      )}
    </div>
  );
};

export const ContextSwitcherWidget: React.FC<
  WidgetProps<ContextSwitcherConfig>
> = ({ id, config, onRemove, onWidgetConfigure, onConfigChange }) => {
  return (
    <BaseWidget
      id={id}
      title={config.name || "Context Tracker"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <ContextSwitcherDisplay
        config={config}
        onConfigChange={onConfigChange}
        widgetId={id}
      />
    </BaseWidget>
  );
};
