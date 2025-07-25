// src/components/widgets/RoutineWidget/RoutineWidgetConfigEditor.tsx

import React, { useState, useEffect, useCallback } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import {
  RoutineConfig,
  RoutineStepConfig,
  CompletionCriteriaType,
} from "./types";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity } from "../../../types/entities";

const generateStepId = () =>
  `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const RoutineWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<RoutineConfig>
> = ({ config, onConfigChange }) => {
  const [availableRoutines, setAvailableRoutines] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutines = async () => {
      setIsLoading(true);
      try {
        const routines = await entitiesApi.getRoutines();
        setAvailableRoutines(routines);
      } catch (err) {
        console.error("Failed to fetch routines:", err);
        setError("Failed to load routines from backend.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoutines();
  }, []);

  const handleLoadRoutine = useCallback(
    async (routineName: string) => {
      if (!routineName) {
        // Optionally clear config if user selects "-- Select --"
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Routine categories are not standard yet, so we assume 'default' or some other logic
        // If your routines are not categorized, this will need adjustment in your API
        const routineEntity = await entitiesApi.getEntity(
          "routine",
          "default",
          routineName,
        );

        const checklist = routineEntity.attributes.checklist?.value || [];
        if (!Array.isArray(checklist)) {
          throw new Error("Routine 'checklist' attribute is not a list.");
        }

        const newSteps: RoutineStepConfig[] = checklist.map((item: any) => ({
          id: generateStepId(),
          name: item.name,
          optional: !item.is_mandatory,
          action: item.default_action,
        }));

        onConfigChange({
          ...config,
          entityName: routineEntity.name,
          name: routineEntity.name,
          steps: newSteps,
          completionCriteria: { type: "all_required" },
        });
      } catch (err: any) {
        setError(`Failed to load '${routineName}': ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [config, onConfigChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, [e.target.name]: e.target.value });
  };

  const handleAddStep = useCallback(() => {
    const newStep: RoutineStepConfig = {
      id: generateStepId(),
      name: "New Manual Step",
      optional: false,
      estimatedTime: 5,
      action: "",
    };
    onConfigChange({ ...config, steps: [...(config.steps || []), newStep] });
  }, [config, onConfigChange]);

  const handleRemoveStep = useCallback(
    (stepIdToRemove: string) => {
      const newSteps = (config.steps || []).filter(
        (s) => s.id !== stepIdToRemove,
      );
      onConfigChange({ ...config, steps: newSteps });
    },
    [config, onConfigChange],
  );

  const handleStepChange = (
    stepId: string,
    field: keyof RoutineStepConfig,
    value: string | boolean | number,
  ) => {
    const newSteps = (config.steps || []).map((s) =>
      s.id === stepId ? { ...s, [field]: value } : s,
    );
    onConfigChange({ ...config, steps: newSteps });
  };

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
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    marginRight: "5px",
    cursor: "pointer",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "10px" }}>
      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Load Routine from Backend</h4>
        <p style={{ fontSize: "0.9em", color: "#666" }}>
          This will replace the current steps with those defined in your UTMS.
        </p>
        <select
          value={config.entityName || ""}
          onChange={(e) => handleLoadRoutine(e.target.value)}
          style={inputStyle}
          disabled={isLoading}
        >
          <option value="">-- Select a Backend Routine --</option>
          {availableRoutines.map((routine) => (
            <option key={routine.name} value={routine.name}>
              {routine.name}
            </option>
          ))}
        </select>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>

      <div style={sectionStyle}>
        <label htmlFor="routineName" style={labelStyle}>
          Widget Display Name:
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

      <div style={sectionStyle}>
        <h4 style={{ marginTop: 0 }}>Steps</h4>
        {(config.steps || []).map((step, index) => (
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
                style={{ marginLeft: "5px" }}
              >
                Optional
              </label>
            </div>
            {step.action && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ ...labelStyle, fontSize: "0.8em" }}>
                  Backend Action:
                </label>
                <pre
                  style={{
                    background: "#f0f0f0",
                    padding: "5px",
                    borderRadius: "4px",
                    fontSize: "0.75em",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {step.action}
                </pre>
              </div>
            )}
            <button
              onClick={() => handleRemoveStep(step.id)}
              style={{
                ...buttonStyle,
                backgroundColor: "#f44336",
                color: "white",
                marginTop: "10px",
              }}
            >
              Remove Step
            </button>
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
          + Add Manual Step
        </button>
      </div>
    </div>
  );
};
