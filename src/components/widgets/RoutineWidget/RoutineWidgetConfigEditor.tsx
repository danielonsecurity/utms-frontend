// Assume these types are in a shared types file or defined alongside RoutineWidget.tsx
// For this example, I'll re-declare simplified versions or assume they are imported.

// export interface RoutineStepConfig {
//   id: string;
//   name: string;
//   optional: boolean;
//   estimatedTime?: number;
// }
// export type StartAnchorType = "relative" | "absolute_time" | "none";
// export interface StartAnchorConfig {
//   type: StartAnchorType;
//   relativeToAnchorId?: string;
//   offsetMinutes?: number;
//   fixedTime?: string;
// }
// export interface TimeWindowConfig {
//   start: string; // HH:mm
//   end: string; // HH:mm
// }
// export type CompletionCriteriaType = "threshold" | "all_required" | "percentage";
// export interface CompletionCriteriaConfig {
//   type: CompletionCriteriaType;
//   minSteps?: number;
//   mandatoryStepIds?: string[];
//   minPercentage?: number;
// }
// export interface RoutineConfig {
//   name: string;
//   symbol?: string;
//   startAnchor: StartAnchorConfig;
//   timeWindow: TimeWindowConfig;
//   steps: RoutineStepConfig[];
//   completionCriteria: CompletionCriteriaConfig;
//   soundEnabled?: boolean;
//   notificationEnabled?: boolean;
//   alarmSoundSrc?: string;
// }

// Import the actual types from your project structure
import React, { useCallback } from "react";
import {
  RoutineConfig,
  RoutineStepConfig,
  StartAnchorType,
  CompletionCriteriaType,
} from "./RoutineWidget"; // Adjust path as needed
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path

// Helper to generate simple unique IDs for new steps
const generateStepId = () =>
  `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const RoutineWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<RoutineConfig>
> = ({ config, onConfigChange }) => {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      let processedValue: string | number | boolean = value;

      if (type === "number") {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue as number))
          processedValue = config[name as keyof RoutineConfig] || 0; // Keep old value or default to 0
      } else if (type === "checkbox") {
        processedValue = (e.target as HTMLInputElement).checked;
      }

      onConfigChange({ ...config, [name]: processedValue });
    },
    [config, onConfigChange],
  );

  // --- Start Anchor Handlers ---
  const handleStartAnchorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const newStartAnchor = { ...config.startAnchor };

      if (name === "type") {
        newStartAnchor.type = value as StartAnchorType;
        // Reset other fields when type changes
        if (value !== "relative") {
          delete newStartAnchor.relativeToAnchorId;
          delete newStartAnchor.offsetMinutes;
        }
        if (value !== "absolute_time") {
          delete newStartAnchor.fixedTime;
        }
      } else if (name === "offsetMinutes") {
        newStartAnchor.offsetMinutes = parseInt(value, 10) || 0;
      } else {
        (newStartAnchor as any)[name] = value;
      }
      onConfigChange({ ...config, startAnchor: newStartAnchor });
    },
    [config, onConfigChange],
  );

  // --- Time Window Handlers ---
  const handleTimeWindowChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      onConfigChange({
        ...config,
        timeWindow: { ...config.timeWindow, [name]: value },
      });
    },
    [config, onConfigChange],
  );

  // --- Steps Handlers ---
  const handleAddStep = useCallback(() => {
    const newStep: RoutineStepConfig = {
      id: generateStepId(),
      name: "New Step",
      optional: false,
      estimatedTime: 5,
    };
    onConfigChange({ ...config, steps: [...config.steps, newStep] });
  }, [config, onConfigChange]);

  const handleRemoveStep = useCallback(
    (stepIdToRemove: string) => {
      // Also remove from mandatoryStepIds if present
      const newMandatoryStepIds =
        config.completionCriteria.mandatoryStepIds?.filter(
          (id) => id !== stepIdToRemove,
        );
      const newCompletionCriteria = {
        ...config.completionCriteria,
        ...(newMandatoryStepIds
          ? { mandatoryStepIds: newMandatoryStepIds }
          : {}),
      };

      onConfigChange({
        ...config,
        steps: config.steps.filter((step) => step.id !== stepIdToRemove),
        completionCriteria: newCompletionCriteria,
      });
    },
    [config, onConfigChange],
  );

  const handleStepChange = useCallback(
    (
      stepId: string,
      field: keyof RoutineStepConfig,
      value: string | number | boolean,
    ) => {
      onConfigChange({
        ...config,
        steps: config.steps.map((step) =>
          step.id === stepId ? { ...step, [field]: value } : step,
        ),
      });
    },
    [config, onConfigChange],
  );

  // --- Completion Criteria Handlers ---
  const handleCompletionCriteriaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const newCriteria = { ...config.completionCriteria };

      if (name === "type") {
        newCriteria.type = value as CompletionCriteriaType;
        // Reset other fields when type changes
        if (value !== "threshold") {
          delete newCriteria.minSteps;
          delete newCriteria.mandatoryStepIds;
        }
        if (value !== "percentage") {
          delete newCriteria.minPercentage;
        }
      } else if (name === "minSteps" || name === "minPercentage") {
        (newCriteria as any)[name] = parseInt(value, 10) || 0;
      }
      onConfigChange({ ...config, completionCriteria: newCriteria });
    },
    [config, onConfigChange],
  );

  const handleMandatoryStepToggle = useCallback(
    (stepId: string, checked: boolean) => {
      let currentMandatoryIds =
        config.completionCriteria.mandatoryStepIds || [];
      if (checked) {
        if (!currentMandatoryIds.includes(stepId)) {
          currentMandatoryIds = [...currentMandatoryIds, stepId];
        }
      } else {
        currentMandatoryIds = currentMandatoryIds.filter((id) => id !== stepId);
      }
      onConfigChange({
        ...config,
        completionCriteria: {
          ...config.completionCriteria,
          mandatoryStepIds: currentMandatoryIds,
        },
      });
    },
    [config, onConfigChange],
  );

  // --- Styles ---
  const sectionStyle: React.CSSProperties = {
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "1px solid #eee",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "10px",
  };
  const checkboxLabelStyle: React.CSSProperties = {
    marginLeft: "5px",
    fontWeight: "normal",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    marginRight: "5px",
    cursor: "pointer",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxHeight: "70vh",
        overflowY: "auto",
        paddingRight: "10px",
      }}
    >
      {/* General Config */}
      <div style={sectionStyle}>
        <label htmlFor="routineName" style={labelStyle}>
          Name:
        </label>
        <input
          type="text"
          id="routineName"
          name="name"
          value={config.name}
          onChange={handleInputChange}
          style={inputStyle}
        />
        <label htmlFor="routineSymbol" style={labelStyle}>
          Symbol (e.g., ☀️):
        </label>
        <input
          type="text"
          id="routineSymbol"
          name="symbol"
          value={config.symbol || ""}
          onChange={handleInputChange}
          style={inputStyle}
          maxLength={2}
        />
      </div>

      {/* Start Anchor Config */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Start Anchor</h4>
        <label htmlFor="startAnchorType" style={labelStyle}>
          Type:
        </label>
        <select
          id="startAnchorType"
          name="type"
          value={config.startAnchor.type}
          onChange={handleStartAnchorChange}
          style={inputStyle}
        >
          <option value="none">None (Manual Start)</option>
          <option value="relative">Relative to Anchor</option>
          <option value="absolute_time">Absolute Time</option>
        </select>

        {config.startAnchor.type === "relative" && (
          <>
            <label htmlFor="relativeToAnchorId" style={labelStyle}>
              Relative to (Anchor ID):
            </label>
            <input
              type="text"
              id="relativeToAnchorId"
              name="relativeToAnchorId"
              value={config.startAnchor.relativeToAnchorId || ""}
              onChange={handleStartAnchorChange}
              style={inputStyle}
              placeholder="e.g., wake_time, sunrise"
            />
            <label htmlFor="offsetMinutes" style={labelStyle}>
              Offset (minutes, +/-):
            </label>
            <input
              type="number"
              id="offsetMinutes"
              name="offsetMinutes"
              value={config.startAnchor.offsetMinutes || 0}
              onChange={handleStartAnchorChange}
              style={inputStyle}
            />
          </>
        )}
        {config.startAnchor.type === "absolute_time" && (
          <>
            <label htmlFor="fixedTime" style={labelStyle}>
              Fixed Start Time:
            </label>
            <input
              type="time"
              id="fixedTime"
              name="fixedTime"
              value={config.startAnchor.fixedTime || "07:00"}
              onChange={handleStartAnchorChange}
              style={inputStyle}
            />
          </>
        )}
      </div>

      {/* Time Window Config */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Time Window</h4>
        <label htmlFor="timeWindowStart" style={labelStyle}>
          Window Start Time:
        </label>
        <input
          type="time"
          id="timeWindowStart"
          name="start"
          value={config.timeWindow.start}
          onChange={handleTimeWindowChange}
          style={inputStyle}
        />
        <label htmlFor="timeWindowEnd" style={labelStyle}>
          Window End Time:
        </label>
        <input
          type="time"
          id="timeWindowEnd"
          name="end"
          value={config.timeWindow.end}
          onChange={handleTimeWindowChange}
          style={inputStyle}
        />
      </div>

      {/* Steps Config */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Steps</h4>
        {config.steps.map((step, index) => (
          <div
            key={step.id}
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "4px",
            }}
          >
            <label htmlFor={`stepName-${step.id}`} style={labelStyle}>
              Step {index + 1} Name:
            </label>
            <input
              type="text"
              id={`stepName-${step.id}`}
              value={step.name}
              onChange={(e) =>
                handleStepChange(step.id, "name", e.target.value)
              }
              style={inputStyle}
            />
            <div>
              <input
                type="checkbox"
                id={`stepOptional-${step.id}`}
                checked={step.optional}
                onChange={(e) =>
                  handleStepChange(step.id, "optional", e.target.checked)
                }
              />
              <label
                htmlFor={`stepOptional-${step.id}`}
                style={checkboxLabelStyle}
              >
                Optional
              </label>
            </div>
            <label
              htmlFor={`stepTime-${step.id}`}
              style={{ ...labelStyle, marginTop: "10px" }}
            >
              Estimated Time (minutes):
            </label>
            <input
              type="number"
              id={`stepTime-${step.id}`}
              value={step.estimatedTime || 0}
              min="0"
              onChange={(e) =>
                handleStepChange(
                  step.id,
                  "estimatedTime",
                  parseInt(e.target.value, 10) || 0,
                )
              }
              style={inputStyle}
            />
            <button
              onClick={() => handleRemoveStep(step.id)}
              style={{
                ...buttonStyle,
                backgroundColor: "#f44336",
                color: "white",
              }}
            >
              Remove Step
            </button>
            {/* Placeholder for reorder buttons */}
          </div>
        ))}
        <button
          onClick={handleAddStep}
          style={{
            ...buttonStyle,
            backgroundColor: "#4CAF50",
            color: "white",
            marginTop: "10px",
          }}
        >
          Add Step
        </button>
      </div>

      {/* Completion Criteria Config */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Completion Criteria</h4>
        <label htmlFor="completionType" style={labelStyle}>
          Type:
        </label>
        <select
          id="completionType"
          name="type"
          value={config.completionCriteria.type}
          onChange={handleCompletionCriteriaChange}
          style={inputStyle}
        >
          <option value="all_required">All Required Steps</option>
          <option value="threshold">Threshold of Steps</option>
          <option value="percentage">Percentage of Steps</option>
        </select>

        {config.completionCriteria.type === "threshold" && (
          <>
            <label htmlFor="minSteps" style={labelStyle}>
              Minimum Steps to Complete:
            </label>
            <input
              type="number"
              id="minSteps"
              name="minSteps"
              min="0"
              value={config.completionCriteria.minSteps || 0}
              onChange={handleCompletionCriteriaChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Mandatory Steps (if any):</label>
            {config.steps.filter((step) => !step.optional).length === 0 &&
              config.completionCriteria.mandatoryStepIds?.length === 0 && (
                <p style={{ fontSize: "0.9em", color: "#777" }}>
                  No non-optional steps defined to select as mandatory. Add
                  steps or mark existing ones as non-optional first if specific
                  steps must be completed.
                </p>
              )}
            {config.steps.map((step) => (
              // Only show non-optional steps as candidates for mandatory, or any step if user explicitly adds one.
              // For simplicity now, show all steps. User should ensure logic makes sense.
              <div key={`mandatory-${step.id}`} style={{ marginBottom: "5px" }}>
                <input
                  type="checkbox"
                  id={`mandatoryStep-${step.id}`}
                  checked={(
                    config.completionCriteria.mandatoryStepIds || []
                  ).includes(step.id)}
                  onChange={(e) =>
                    handleMandatoryStepToggle(step.id, e.target.checked)
                  }
                  disabled={
                    step.optional &&
                    !(
                      config.completionCriteria.mandatoryStepIds || []
                    ).includes(step.id)
                  } // Optional steps can't be mandatory unless already selected
                />
                <label
                  htmlFor={`mandatoryStep-${step.id}`}
                  style={checkboxLabelStyle}
                >
                  {step.name}{" "}
                  {step.optional
                    ? "(Optional Step - cannot be mandatory unless explicitly chosen)"
                    : ""}
                </label>
              </div>
            ))}
          </>
        )}
        {config.completionCriteria.type === "percentage" && (
          <>
            <label htmlFor="minPercentage" style={labelStyle}>
              Minimum Percentage Complete (0-100):
            </label>
            <input
              type="number"
              id="minPercentage"
              name="minPercentage"
              min="0"
              max="100"
              value={config.completionCriteria.minPercentage || 0}
              onChange={handleCompletionCriteriaChange}
              style={inputStyle}
            />
          </>
        )}
      </div>

      {/* Sound & Notification Config (like Timer) */}
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Notifications</h4>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <input
            type="checkbox"
            id="routineSoundEnabled"
            name="soundEnabled"
            checked={!!config.soundEnabled}
            onChange={handleInputChange}
          />
          <label htmlFor="routineSoundEnabled">
            Enable Sound on Completion
          </label>
        </div>
        {config.soundEnabled && (
          <div>
            <label htmlFor="alarmSoundSrc" style={labelStyle}>
              Alarm Sound Source (URL/Path):
            </label>
            <input
              type="text"
              id="alarmSoundSrc"
              name="alarmSoundSrc"
              value={config.alarmSoundSrc || ""}
              onChange={handleInputChange}
              style={inputStyle}
              placeholder="/sounds/default_routine_complete.wav"
            />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            id="routineNotificationEnabled"
            name="notificationEnabled"
            checked={!!config.notificationEnabled}
            onChange={handleInputChange}
          />
          <label htmlFor="routineNotificationEnabled">
            Enable Desktop Notification on Completion
          </label>
        </div>
      </div>

      <p style={{ fontSize: "0.8em", color: "#555", marginTop: "10px" }}>
        Note: Changes are applied immediately. Close the modal to save.
      </p>
    </div>
  );
};
