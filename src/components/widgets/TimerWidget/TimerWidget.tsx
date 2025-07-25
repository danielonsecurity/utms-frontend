import React, { useState, useEffect, useRef, useCallback } from "react";
import { isEqual } from "lodash";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity as EntityInstance } from "../../../types/entities"; // Assuming you have this type defined

/**
 * TimerConfig represents the state of a timer entity from the backend.
 * The frontend receives this as a prop and uses it to render the display.
 */
export interface TimerConfig {
  name: string;
  duration_expression: string;
  duration_seconds: number;
  autoStart: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  alarmSoundSrc?: string;
  // --- Backend-driven state attributes ---
  status: "idle" | "running" | "paused" | "finished";
  end_time?: string; // ISO datetime string from the backend when running
}

/**
 * The props for the main TimerWidget component.
 * It now requires an onStateChange callback to notify the parent component
 * when an API call has successfully changed the backend entity's state.
 */
interface FullTimerWidgetProps extends WidgetProps<TimerConfig> {
  onStateChange: (updatedEntity: EntityInstance) => void;
}

/**
 * A pure utility function to format seconds into MM:SS format.
 */
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * The core display component. It is now "dumb" and reflects the state
 * passed down through its props. It handles the visual countdown and button clicks.
 */
const TimerDisplay: React.FC<{
  config: TimerConfig;
  onStateChange: (updatedEntity: EntityInstance) => void;
}> = ({ config, onStateChange }) => {
  // This state is for the *visual countdown only*. The canonical time is derived from props.
  const [displayTime, setDisplayTime] = useState(config.duration_seconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Effect to set up the alarm sound object.
  useEffect(() => {
    if (config.soundEnabled && config.alarmSoundSrc) {
      audioRef.current = new Audio(config.alarmSoundSrc);
      audioRef.current.onerror = () =>
        console.warn(
          `TimerWidget: Failed to load audio from ${config.alarmSoundSrc}`,
        );
    } else {
      audioRef.current = null;
    }
  }, [config.soundEnabled, config.alarmSoundSrc]);

  // The main effect for handling the visual countdown based on backend state.
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (config.status === "running" && config.end_time) {
      const endTime = new Date(config.end_time).getTime();

      const updateDisplay = () => {
        const now = Date.now();
        const remainingSeconds = Math.round((endTime - now) / 1000);
        setDisplayTime(Math.max(0, remainingSeconds));
      };

      updateDisplay(); // Set initial time immediately
      intervalId = setInterval(updateDisplay, 1000); // Update every second
    } else {
      // For 'idle', 'paused', or 'finished' status, just show the full duration.
      // A future improvement could use `remaining_at_pause` from the backend for more accuracy.
      setDisplayTime(config.duration_seconds);
    }

    // Cleanup function to clear the interval when the component unmounts or props change.
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [config.status, config.end_time, config.duration_seconds]);

  // Event handler for the Start/Pause button. It now calls the backend API.
  const handleStartPause = async () => {
    const entityCategory = "default"; // Assuming a default category for now
    const entityName = config.name;

    try {
      let updatedEntity: EntityInstance;
      if (config.status === "running") {
        updatedEntity = await entitiesApi.pauseTimer(
          entityCategory,
          entityName,
        );
      } else {
        // Handles 'idle', 'paused', 'finished' states
        updatedEntity = await entitiesApi.startTimer(
          entityCategory,
          entityName,
        );
      }
      // Notify the parent component that the state has changed on the backend.
      onStateChange(updatedEntity);
    } catch (error) {
      console.error("Failed to start/pause timer:", error);
      // Optionally, show an error message to the user in the UI.
    }
  };

  // Event handler for the Reset button. It now calls the backend API.
  const handleReset = async () => {
    const entityCategory = "default";
    const entityName = config.name;
    try {
      const updatedEntity = await entitiesApi.resetTimer(
        entityCategory,
        entityName,
      );
      onStateChange(updatedEntity);
    } catch (error) {
      console.error("Failed to reset timer:", error);
    }
  };

  // Derive UI display state directly from props.
  const isFinished = config.status === "finished";
  const isRunning = config.status === "running";
  const buttonText = isRunning ? "Pause" : "Start";

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    margin: "0 5px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    minWidth: "80px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "clamp(24px, 10vw, 48px)",
          fontWeight: "bold",
          margin: "10px 0",
          color: isFinished ? "#4CAF50" : "#333",
        }}
      >
        {isFinished ? "Finished!" : formatTime(displayTime)}
      </div>
      <div style={{ display: "flex", marginTop: "10px" }}>
        <button
          onClick={handleStartPause}
          disabled={isFinished}
          style={{
            ...buttonStyle,
            backgroundColor: isRunning ? "#ffc107" : "#4CAF50",
            color: "white",
          }}
        >
          {buttonText}
        </button>
        <button
          onClick={handleReset}
          style={{ ...buttonStyle, backgroundColor: "#f44336", color: "white" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

/**
 * The main exported widget component.
 * It manages syncing configuration changes and periodic state refreshes.
 */
export const TimerWidget: React.FC<FullTimerWidgetProps> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
  onStateChange, // This prop is crucial now
}) => {
  const entityCategory = "default"; // Hard-coded for simplicity
  const prevConfigRef = useRef<TimerConfig>(config);

  // This effect syncs changes from the config editor modal to the backend.
  useEffect(() => {
    if (!isEqual(config, prevConfigRef.current)) {
      console.log("Timer config changed, syncing with backend...", {
        from: prevConfigRef.current,
        to: config,
      });
      const changes: Array<[string, any]> = Object.entries(config).filter(
        ([key, value]) => !isEqual(value, (prevConfigRef.current as any)[key]),
      );

      for (const [attrName, newValue] of changes) {
        // Do not sync backend-controlled state attributes back to the backend.
        if (["duration_seconds", "status", "end_time"].includes(attrName))
          continue;

        console.log(`- Syncing attribute: ${attrName}`);
        entitiesApi
          .updateEntityAttribute(
            "timer",
            entityCategory,
            prevConfigRef.current.name,
            attrName,
            { value: newValue },
          )
          .catch((err) => {
            console.error(`Failed to sync timer attribute '${attrName}':`, err);
          });
      }
      prevConfigRef.current = config;
    }
  }, [config, entityCategory]);

  // This effect periodically re-syncs the timer's state from the backend
  // to correct any drift between the frontend countdown and the backend reality.
  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log(`Periodic sync for timer: ${config.name}`);
      entitiesApi
        .getEntity("timer", entityCategory, config.name)
        .then((entity) => {
          onStateChange(entity);
        })
        .catch((err) =>
          console.error(
            `Periodic sync for timer '${config.name}' failed:`,
            err,
          ),
        );
    }, 60000); // Sync every 60 seconds

    return () => clearInterval(syncInterval);
  }, [config.name, entityCategory, onStateChange]);

  // The remove handler now deletes from the backend before updating the UI.
  const handleRemove = () => {
    console.log(`Removing timer widget and entity: ${config.name}`);
    entitiesApi
      .deleteEntity("timer", entityCategory, config.name)
      .then(() => {
        console.log(`Backend entity '${config.name}' deleted successfully.`);
        onRemove(id); // Call the original remove handler to update the UI
      })
      .catch((err) => {
        console.error("Failed to delete backend timer entity:", err);
        // Still remove from UI even if backend fails, to avoid a broken widget.
        onRemove(id);
      });
  };

  return (
    <BaseWidget
      id={id}
      title={config.name || "Timer"}
      onRemove={handleRemove}
      onConfigure={onWidgetConfigure}
    >
      <TimerDisplay config={config} onStateChange={onStateChange} />
    </BaseWidget>
  );
};
