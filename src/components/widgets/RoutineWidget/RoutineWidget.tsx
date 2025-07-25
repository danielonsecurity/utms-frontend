// src/components/widgets/RoutineWidget/RoutineWidget.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";
import { RoutineConfig } from "./types";
import { entitiesApi } from "../../../api/entitiesApi"; // Ensure this path is correct

// Internal runtime types
export type RoutineStatus =
  | "not_started"
  | "in_progress"
  | "interrupted"
  | "completed"
  | "abandoned";

// Enhanced state for each step to handle async actions
export interface StepExecutionState {
  completed: boolean;
  isLoading: boolean;
  error?: string;
}

interface RoutineDisplayProps {
  config: RoutineConfig;
  currentStatus: RoutineStatus;
  stepStates: Record<string, StepExecutionState>;
  onToggleStep: (stepId: string) => void;
  onStart: () => void;
}

// RoutineDisplay: The visual component. It's "dumb" and just renders what it's given.
const RoutineDisplay: React.FC<RoutineDisplayProps> = ({
  config,
  currentStatus,
  stepStates,
  onToggleStep,
}) => {
  const {
    completedStepsCount,
    totalSteps,
    isCriteriaMet,
    mandatoryStepsStatus,
  } = useMemo(() => {
    let completed = 0;
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
            !!stepStates[id]?.completed;
        });
        criteriaMet =
          completed >= (config.completionCriteria.minSteps || 0) &&
          mandatoryMet;
        break;
      case "percentage":
        criteriaMet =
          (completed / (config.steps.length || 1)) * 100 >=
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
    <div style={{ padding: "10px" }}>
      <h2>
        {config.symbol} {config.name} [{currentStatus.toUpperCase()}]
      </h2>
      <p>
        Progress: {completedStepsCount}/{totalSteps} steps completed.
        {config.completionCriteria.type === "threshold" &&
          Object.keys(mandatoryStepsStatus).length > 0 &&
          ` Must complete: [${Object.entries(mandatoryStepsStatus)
            .map(([name, done]) => `${done ? "✓" : "❌"} ${name}`)
            .join(", ")}]`}
      </p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {config.steps.map((step) => {
          const state = stepStates[step.id] || {
            completed: false,
            isLoading: false,
          };
          return (
            <li
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #eee",
                opacity: state.completed ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={state.completed}
                onChange={() => onToggleStep(step.id)}
                disabled={
                  state.isLoading ||
                  currentStatus === "completed" ||
                  currentStatus === "abandoned"
                }
                style={{ marginRight: "10px", transform: "scale(1.2)" }}
              />
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    textDecoration: state.completed ? "line-through" : "none",
                  }}
                >
                  {step.name} {step.optional ? "(optional)" : ""}
                </span>
                {state.isLoading && (
                  <span style={{ marginLeft: "10px" }}>⏳</span>
                )}
                {state.error && (
                  <div style={{ color: "red", fontSize: "0.8em" }}>
                    Error: {state.error}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// RoutineWidget: The main component with all the logic and state.
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
  >({});
  const [actualStartTime, setActualStartTime] = useState<Date | undefined>();

  // Effect to reset state if config changes (e.g., new routine loaded)
  useEffect(() => {
    setCurrentStatus("not_started");
    setStepStates(
      Object.fromEntries(
        (config.steps || []).map((step) => [
          step.id,
          { completed: false, isLoading: false, error: undefined },
        ]),
      ),
    );
    setActualStartTime(undefined);
  }, [config.steps, config.name, config.entityName]);

  const handleToggleStep = useCallback(
    async (stepId: string) => {
      const stepConfig = config.steps.find((s) => s.id === stepId);
      if (!stepConfig) return;

      const isCurrentlyCompleted = stepStates[stepId]?.completed;
      const isCheckingOn = !isCurrentlyCompleted;

      // Optimistically update UI and set loading state
      setStepStates((prev) => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          completed: isCheckingOn,
          isLoading: isCheckingOn && !!stepConfig.action, // Only show loader if there's an action
          error: undefined,
        },
      }));

      // Start the routine on the first interaction
      if (currentStatus === "not_started" && isCheckingOn) {
        setCurrentStatus("in_progress");
        setActualStartTime(new Date());
      }

      // Execute action only when checking the box ON
      if (isCheckingOn && stepConfig.action) {
        try {
          await entitiesApi.executeHyCode(stepConfig.action);
          // Success: just turn off loading
          setStepStates((prev) => ({
            ...prev,
            [stepId]: { ...prev[stepId], isLoading: false },
          }));
        } catch (err: any) {
          // Failure: revert the checkbox and show an error
          setStepStates((prev) => ({
            ...prev,
            [stepId]: {
              ...prev[stepId],
              completed: false, // Revert!
              isLoading: false,
              error: err.message || "Action failed on backend.",
            },
          }));
        }
      }
    },
    [config.steps, stepStates, currentStatus],
  );

  const handleStart = useCallback(() => {
    setCurrentStatus("in_progress");
    setActualStartTime(new Date());
  }, []);

  return (
    <BaseWidget
      id={id}
      title={`${config.symbol || "📋"} ${config.name || "Routine"}`}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <RoutineDisplay
        config={config}
        currentStatus={currentStatus}
        stepStates={stepStates}
        onToggleStep={handleToggleStep}
        onStart={handleStart}
      />
    </BaseWidget>
  );
};
