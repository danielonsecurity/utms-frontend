import React, { useState, useEffect, useRef, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import {
  WidgetProps,
  WidgetConfigComponentProps,
} from "../../widgets/registry";

export interface TimerConfig {
  name: string;
  duration: number; // in seconds
  autoStart: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  alarmSoundSrc?: string;
}

interface TimerDisplayProps {
  // Internal component
  config: TimerConfig;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const TimerDisplay: React.FC<TimerDisplayProps> = ({ config }) => {
  const [remainingTime, setRemainingTime] = useState(config.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialAutoStartDone = useRef(false);

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

  useEffect(() => {
    setRemainingTime(config.duration);
    setIsRunning(false);
    setIsFinished(false);
    initialAutoStartDone.current = false;
  }, [config.duration]);

  useEffect(() => {
    if (
      config.autoStart &&
      config.duration > 0 &&
      !isRunning &&
      !isFinished &&
      !initialAutoStartDone.current
    ) {
      setIsRunning(true);
      initialAutoStartDone.current = true;
    }
  }, [config.autoStart, config.duration, isRunning, isFinished]);

  const playSound = useCallback(() => {
    if (config.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((error) =>
          console.warn("TimerWidget: Error playing sound:", error),
        );
    }
  }, [config.soundEnabled]);

  const showNotification = useCallback(() => {
    if (!config.notificationEnabled) return;
    if (!("Notification" in window)) {
      console.warn("TimerWidget: This browser does not support notifications.");
      return;
    }
    const show = () =>
      new Notification("Timer Finished!", {
        body: `${config.name || "Your timer"} has ended.`,
      });
    if (Notification.permission === "granted") show();
    else if (Notification.permission !== "denied")
      Notification.requestPermission().then((p) => p === "granted" && show());
  }, [config.notificationEnabled, config.name]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isRunning && remainingTime > 0) {
      intervalId = setInterval(
        () => setRemainingTime((prev) => Math.max(0, prev - 1)),
        1000,
      );
    } else if (isRunning && remainingTime === 0) {
      setIsRunning(false);
      setIsFinished(true);
      playSound();
      showNotification();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, remainingTime, playSound, showNotification]);

  const handleStartPause = () => {
    if (isFinished || (remainingTime <= 0 && !isRunning)) return;
    setIsRunning(!isRunning);
  };
  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setRemainingTime(config.duration);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

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
        {isFinished ? "Finished!" : formatTime(remainingTime)}
      </div>
      <div style={{ display: "flex", marginTop: "10px" }}>
        <button
          onClick={handleStartPause}
          disabled={remainingTime === 0 && !isFinished}
          style={{
            ...buttonStyle,
            backgroundColor: isRunning ? "#ffc107" : "#4CAF50",
            color: "white",
          }}
        >
          {isRunning ? "Pause" : "Start"}
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

export const TimerWidget: React.FC<WidgetProps<TimerConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  return (
    <BaseWidget
      id={id}
      title={config.name || "Timer"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <TimerDisplay config={config} />
    </BaseWidget>
  );
};
