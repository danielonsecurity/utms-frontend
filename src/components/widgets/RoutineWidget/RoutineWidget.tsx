import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";
import { RoutineConfig } from "./types";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity } from "../../../types/entities";

export type RoutineStatus = "not_started" | "in_progress" | "completed";
export interface StepExecutionState {
  completed: boolean;
  isLoading: boolean;
  error?: string;
}

// --- IMPROVEMENT: Added onExecuteAction prop ---
interface RoutineDisplayProps {
  config: RoutineConfig;
  currentStatus: RoutineStatus;
  stepStates: Record<string, StepExecutionState>;
  isBusy: boolean;
  onToggleStep: (stepId: string) => void;
  onStartRoutine: () => void;
  onMarkAsComplete: () => void;
  onReset: () => void;
  onExecuteAction: (actionCode: string) => void; // New prop for executing actions
}

const RoutineDisplay: React.FC<RoutineDisplayProps> = ({
  config,
  currentStatus,
  stepStates,
  isBusy,
  onToggleStep,
  onStartRoutine,
  onMarkAsComplete,
  onReset,
  onExecuteAction, // Destructure new prop
}) => {
  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "10px",
    borderBottom: "1px solid #ddd",
    marginBottom: "10px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "0.9em",
    cursor: "pointer",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };
  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "white",
    borderColor: "#007bff",
  };

  // --- IMPROVEMENT: Progress Bar Calculation ---
  const { completedCount, totalCount, totalTime, completedTime } =
    useMemo(() => {
      let completedCount = 0;
      let totalCount = 0;
      let totalTime = 0;
      let completedTime = 0;

      config.steps.forEach((step) => {
        if (!step.optional) {
          totalCount++;
          totalTime += step.estimatedTime || 0;
          if (stepStates[step.id]?.completed) {
            completedCount++;
            completedTime += step.estimatedTime || 0;
          }
        }
      });
      return { completedCount, totalCount, totalTime, completedTime };
    }, [config.steps, stepStates]);

  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const renderHeaderButtons = () => {
    if (isBusy) return <span>Working...</span>;
    switch (currentStatus) {
      case "not_started":
        return (
          <button style={primaryButtonStyle} onClick={onStartRoutine}>
            Start Routine
          </button>
        );
      case "in_progress":
        return (
          <button
            style={primaryButtonStyle}
            onClick={onMarkAsComplete}
            disabled={isBusy}
            title="Finish routine now (auto-completes mandatory steps)"
          >
            Mark as Complete
          </button>
        );
      case "completed":
        return (
          <button style={buttonStyle} onClick={onReset}>
            Restart Routine
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "10px" }}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0 }}>
            {config.symbol} {config.name}
          </h3>
          <span style={{ fontSize: "0.8em", color: "#666" }}>
            Status: {currentStatus.replace("_", " ")}
          </span>
        </div>
        <div>{renderHeaderButtons()}</div>
      </div>

      {/* --- IMPROVEMENT: Added Progress Bar Display --- */}
      {currentStatus === "in_progress" && (
        <div style={{ marginBottom: "15px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8em",
              color: "#666",
              marginBottom: "4px",
            }}
          >
            <span>
              Progress: {completedCount} / {totalCount}
            </span>
            <span>
              Est. Time: {completedTime} / {totalTime} min
            </span>
          </div>
          <div
            style={{
              background: "#e0e0e0",
              borderRadius: "10px",
              height: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                background: "#007bff",
                height: "100%",
                transition: "width 0.3s ease-in-out",
              }}
            />
          </div>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
                  state.isLoading || isBusy || currentStatus !== "in_progress"
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
              {/* --- IMPROVEMENT: Added Action Button --- */}
              {step.action &&
                !state.completed &&
                currentStatus === "in_progress" && (
                  <button
                    onClick={() => onExecuteAction(step.action!)}
                    disabled={state.isLoading || isBusy}
                    style={{
                      ...buttonStyle,
                      marginLeft: "10px",
                      fontSize: "0.8em",
                      padding: "4px 8px",
                    }}
                    title={`Execute: ${step.action}`}
                  >
                    ▶️
                  </button>
                )}
            </li>
          );
        })}
      </ul>
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
  >({});
  const [isBusy, setIsBusy] = useState(false);

  const syncStateFromEntity = useCallback(
    (entity: Entity) => {
      const isActive =
        !!entity.attributes["active_occurrence_start_time"]?.value;

      const backendChecklist = entity.attributes.checklist?.value || [];
      const backendStateMap = new Map();

      backendChecklist.forEach((plist: any) => {
        if (Array.isArray(plist)) {
          const itemObj: { [key: string]: any } = {};
          for (let i = 0; i < plist.length; i += 2) {
            const key = plist[i];
            const value = plist[i + 1];
            if (key !== undefined) {
              itemObj[key] = value;
            }
          }
          if (itemObj.name) {
            backendStateMap.set(itemObj.name, itemObj);
          }
        }
      });

      const newStatus = isActive ? "in_progress" : "completed";

      // Determine if it should be 'not_started' vs 'completed'
      // If not active and has no occurrences, it's not started.
      // If not active but has occurrences, it's completed from a previous run.
      const hasOccurrences =
        (entity.attributes.occurrences?.value?.length || 0) > 0;
      setCurrentStatus(
        isActive ? "in_progress" : hasOccurrences ? "completed" : "not_started",
      );

      const newStepStates = Object.fromEntries(
        config.steps.map((step) => {
          const backendStep = backendStateMap.get(step.name);
          // If the routine is not active, all steps should be marked as not completed.
          const isCompleted = isActive
            ? String(backendStep?.completed).toLowerCase() === "true"
            : false;

          return [
            step.id,
            {
              completed: isCompleted,
              isLoading: false,
              error: undefined,
            },
          ];
        }),
      );
      setStepStates(newStepStates);
      setIsBusy(false);
    },
    [config.steps],
  );

  useEffect(() => {
    if (!config.entityName) {
      setCurrentStatus("not_started");
      setStepStates({});
      return;
    }
    setIsBusy(true);
    entitiesApi
      .getEntity("routine", config.category || "default", config.entityName)
      .then(syncStateFromEntity)
      .catch((err) => {
        console.error("Failed to fetch initial routine state:", err);
        setCurrentStatus("not_started");
        setStepStates({});
        setIsBusy(false);
      });
  }, [config.entityName, config.category, syncStateFromEntity]);

  // --- LOGIC FIX: Redefined for "Manual Completion" path ---
  const isAllStepsComplete = useMemo(() => {
    if (
      currentStatus !== "in_progress" ||
      !config.steps ||
      config.steps.length === 0
    ) {
      return false;
    }
    return config.steps.every((step) => stepStates[step.id]?.completed);
  }, [config.steps, stepStates, currentStatus]);

  const handleMarkAsComplete = useCallback(async () => {
    if (!config.entityName) return;
    setIsBusy(true);
    try {
      const updatedEntity = await entitiesApi.endOccurrence(
        "routine",
        config.category || "default",
        config.entityName,
        {},
      );
      syncStateFromEntity(updatedEntity);
    } catch (error: any) {
      alert(`Error completing routine: ${error.message}`);
      setIsBusy(false);
    }
  }, [config.entityName, config.category, syncStateFromEntity]);

  useEffect(() => {
    if (isAllStepsComplete && currentStatus === "in_progress") {
      console.log(
        "All steps manually completed! Automatically ending routine.",
      );
      handleMarkAsComplete();
    }
  }, [isAllStepsComplete, currentStatus, handleMarkAsComplete]);

  const handleExecuteAction = useCallback(
    async (actionCode: string) => {
      console.log("--- handleExecuteAction Triggered ---");
      console.log(
        "The actionCode string being sent to the API is:",
        actionCode,
      );
      if (!config.entityName) return;
      setIsBusy(true);
      try {
        await entitiesApi.executeAction(
          actionCode,
          `routine:${config.category || "default"}:${config.entityName}`,
        );
        // Re-sync after action, as it might change things (e.g., end an occurrence)
        const updatedEntity = await entitiesApi.getEntity(
          "routine",
          config.category || "default",
          config.entityName,
        );
        syncStateFromEntity(updatedEntity);
      } catch (error: any) {
        alert(`Action failed: ${error.message}`);
        setIsBusy(false);
      }
    },
    [config.entityName, config.category, syncStateFromEntity],
  );

  const handleStartRoutine = useCallback(async () => {
    if (!config.entityName) return;
    setIsBusy(true);
    try {
      const updatedEntity = await entitiesApi.startOccurrence(
        "routine",
        config.category || "default",
        config.entityName,
      );
      syncStateFromEntity(updatedEntity);
    } catch (error: any) {
      alert(`Error starting routine: ${error.message}`);
      setIsBusy(false);
    }
  }, [config.entityName, config.category, syncStateFromEntity]);

  const handleToggleStep = useCallback(
    async (stepId: string) => {
      if (currentStatus !== "in_progress" || !config.entityName) return;
      const stepConfig = config.steps.find((s) => s.id === stepId);
      if (!stepConfig) return;

      const currentStepState = stepStates[stepId];
      const newCompletedStatus = !currentStepState.completed;

      setStepStates((prev) => ({
        ...prev,
        [stepId]: { ...prev[stepId], isLoading: true },
      }));

      try {
        const updatedEntity = await entitiesApi.setStepStatus(
          "routine",
          config.category || "default",
          config.entityName,
          stepConfig.name,
          newCompletedStatus,
        );
        syncStateFromEntity(updatedEntity);
      } catch (err: any) {
        alert(`Error toggling step: ${err.message}`);
        // Re-sync on error to get the true state from the backend
        const freshEntity = await entitiesApi.getEntity(
          "routine",
          config.category || "default",
          config.entityName,
        );
        syncStateFromEntity(freshEntity);
      }
    },
    [config, currentStatus, stepStates, syncStateFromEntity],
  );

  const onReset = handleStartRoutine;

  return (
    <BaseWidget
      id={id}
      title="Routine"
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <RoutineDisplay
        config={config}
        currentStatus={currentStatus}
        stepStates={stepStates}
        isBusy={isBusy}
        onToggleStep={handleToggleStep}
        onStartRoutine={handleStartRoutine}
        onMarkAsComplete={handleMarkAsComplete}
        onReset={onReset}
        onExecuteAction={handleExecuteAction}
      />
    </BaseWidget>
  );
};
