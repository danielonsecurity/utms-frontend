import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry"; // Assuming WidgetConfigComponentProps is also here
import { RoutineConfig } from "./types.ts";

// Internal types for runtime state
export type RoutineStatus =
  | "not_started"
  | "in_progress"
  | "interrupted"
  | "completed"
  | "abandoned";

export interface InterruptionLog {
  startTime: Date;
  endTime?: Date;
  reason?: string;
}

interface StepExecutionState {
  completed: boolean;
  // could add actual start/end time per step later
}

interface RoutineDisplayProps {
  config: RoutineConfig;
  // Pass down state and handlers from RoutineWidget
  currentStatus: RoutineStatus;
  stepStates: Record<string, StepExecutionState>;
  actualStartTime?: Date;
  // ... other state and handlers
  onToggleStep: (stepId: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  // ... etc.
}

// RoutineDisplay: The actual UI and interaction logic for an active routine
const RoutineDisplay: React.FC<RoutineDisplayProps> = ({
  config,
  currentStatus,
  stepStates,
  // ... other props
  onToggleStep,
  // ...
}) => {
  // ... UI rendering based on props (name, steps, status, progress)
  // ... Buttons for start, pause, resume, step toggles etc.
  // ... Logic to calculate progress based on stepStates and config.completionCriteria

  const {
    completedStepsCount,
    totalSteps,
    isCriteriaMet,
    mandatoryStepsStatus,
  } = useMemo(() => {
    let completed = 0;
    const currentStepStates = config.steps.map(
      (s) => stepStates[s.id]?.completed || false,
    );
    config.steps.forEach((step) => {
      if (stepStates[step.id]?.completed) {
        completed++;
      }
    });

    let criteriaMet = false;
    const mandatoryStatus: Record<string, boolean> = {};

    switch (config.completionCriteria.type) {
      case "all_required":
        criteriaMet = config.steps.every(
          (s) => s.optional || stepStates[s.id]?.completed,
        );
        break;
      case "threshold":
        const mandatoryMet = (
          config.completionCriteria.mandatoryStepIds || []
        ).every((id) => stepStates[id]?.completed);
        (config.completionCriteria.mandatoryStepIds || []).forEach((id) => {
          mandatoryStatus[config.steps.find((s) => s.id === id)?.name || id] =
            stepStates[id]?.completed;
        });
        criteriaMet =
          completed >= (config.completionCriteria.minSteps || 0) &&
          mandatoryMet;
        break;
      case "percentage":
        criteriaMet =
          (completed / config.steps.length) * 100 >=
          (config.completionCriteria.minPercentage || 0);
        break;
    }

    return {
      completedStepsCount: completed,
      totalSteps: config.steps.length,
      isCriteriaMet: criteriaMet,
      mandatoryStepsStatus: mandatoryStatus,
    };
  }, [config, stepStates]);

  return (
    <div /* style appropriately */>
      {/* Name and Symbol */}
      <h2>
        {config.symbol} {config.name} [{currentStatus.toUpperCase()}]
      </h2>

      {/* Anchored Timing Display */}
      {/* ... logic to display this based on config.startAnchor and config.timeWindow ... */}

      {/* Progress Tracker */}
      <p>
        {completedStepsCount}/{totalSteps} steps done.
        {config.completionCriteria.type === "threshold" &&
          config.completionCriteria.mandatoryStepIds?.length &&
          ` Must complete: [${Object.entries(mandatoryStepsStatus)
            .map(([name, done]) => `${done ? "✓" : "❌"} ${name}`)
            .join(", ")}]`}
      </p>

      {/* Steps List */}
      <ul>
        {config.steps.map((step) => (
          <li key={step.id}>
            <input
              type="checkbox"
              checked={stepStates[step.id]?.completed || false}
              onChange={() => onToggleStep(step.id)}
              disabled={
                currentStatus === "completed" || currentStatus === "abandoned"
              }
            />
            {step.name} {step.optional ? "(optional)" : "(required)"}
            {step.estimatedTime && ` (~${step.estimatedTime}m)`}
          </li>
        ))}
      </ul>

      {/* Action Buttons (conditionally rendered/disabled) */}
      {/* ... Start, Pause, Resume, Abandon, Complete buttons ... */}
      {/* ... Mood/Friction inputs (e.g., simple select or radio buttons) ... */}
      {/* ... Notes textarea ... */}
    </div>
  );
};

export const RoutineWidget: React.FC<WidgetProps<RoutineConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  const [currentStatus, setCurrentStatus] =
    useState<RoutineStatus>("not_started");
  const [stepStates, setStepStates] = useState<
    Record<string, StepExecutionState>
  >(() =>
    Object.fromEntries(
      config.steps.map((step) => [step.id, { completed: false }]),
    ),
  );
  const [actualStartTime, setActualStartTime] = useState<Date | undefined>();
  // ... other states: actualEndTime, interruptions, frictionScore, moodScore, notes

  // Effect to reset state if config.steps change significantly (e.g., different routine loaded)
  useEffect(() => {
    setCurrentStatus("not_started");
    setStepStates(
      Object.fromEntries(
        config.steps.map((step) => [step.id, { completed: false }]),
      ),
    );
    setActualStartTime(undefined);
    // ... reset other dynamic states
  }, [config.steps, config.name]); // Reset if steps array reference or name changes

  const handleToggleStep = useCallback(
    (stepId: string) => {
      setStepStates((prev) => ({
        ...prev,
        [stepId]: { ...prev[stepId], completed: !prev[stepId]?.completed },
      }));
      if (currentStatus === "not_started") {
        setCurrentStatus("in_progress");
        if (!actualStartTime) setActualStartTime(new Date());
      }
    },
    [currentStatus, actualStartTime],
  );

  const handleStart = useCallback(() => {
    setCurrentStatus("in_progress");
    setActualStartTime(new Date());
  }, []);
  // ... other handlers for pause, resume, complete, abandon, setMood, setFriction, setNotes

  // Check completion status whenever stepStates or currentStatus change
  useEffect(() => {
    if (currentStatus === "in_progress") {
      // Complex logic to check if config.completionCriteria are met based on stepStates
      // If met, could auto-complete or enable a "Mark as Complete" button.
      // For now, this logic would be more for display or enabling the complete button
    }
  }, [stepStates, config.completionCriteria, currentStatus]);

  return (
    <BaseWidget
      id={id}
      title={`${config.symbol || ""} ${config.name || "Routine"}`}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <RoutineDisplay
        config={config}
        currentStatus={currentStatus}
        stepStates={stepStates}
        actualStartTime={actualStartTime}
        onToggleStep={handleToggleStep}
        onStart={handleStart}
        // ... pass other state and handlers
      />
    </BaseWidget>
  );
};
