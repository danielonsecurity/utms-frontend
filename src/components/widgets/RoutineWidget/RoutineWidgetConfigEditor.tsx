// src/components/widgets/RoutineWidget/RoutineWidgetConfigEditor.tsx

import React, { useState, useEffect, useCallback } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import { RoutineConfig, RoutineStepConfig } from "./types";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity } from "../../../types/entities";

const generateStepId = () =>
  `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const plistToObject = (plist: any[]): Record<string, any> => {
  const obj: Record<string, any> = {};
  for (let i = 0; i < plist.length; i += 2) {
    const key = plist[i];
    const value = plist[i + 1];
    if (key !== undefined) {
      obj[key] = value;
    }
  }
  return obj;
};

// --- START OF THE CORRECTED HELPER FUNCTION ---
const hyArrayToString = (arr: any[]): string => {
  if (!Array.isArray(arr) || arr.length === 0) return "()";

  // The first element is the function name and MUST NOT be quoted.
  const functionName = arr[0];

  // The rest of the elements are arguments and must be processed correctly.
  const args = arr.slice(1).map((part) => {
    if (typeof part === "string") {
      // JSON.stringify is the safest way to handle quoting and escaping.
      return JSON.stringify(part);
    }
    if (typeof part === "boolean") {
      // Hy symbols for booleans are True/False, not 'true'/'false'.
      const str = String(part);
      return str.charAt(0).toUpperCase() + str.slice(1); // e.g., true -> "True"
    }
    if (typeof part === "number") {
      return String(part);
    }
    if (Array.isArray(part)) {
      // Recurse for nested expressions.
      return hyArrayToString(part);
    }
    // Fallback for any other type (e.g., null, undefined).
    return String(part);
  });

  // Join the unquoted function name with the processed arguments.
  return `(${functionName} ${args.join(" ")})`;
};
// --- END OF THE CORRECTED HELPER FUNCTION ---

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
    (routineName: string) => {
      if (!routineName) return;

      const selectedRoutine = availableRoutines.find(
        (r) => r.name === routineName,
      );
      if (!selectedRoutine) {
        setError(
          `Could not find details for '${routineName}' in the loaded list.`,
        );
        return;
      }

      const checklistPlists = selectedRoutine.attributes.checklist?.value || [];
      if (!Array.isArray(checklistPlists)) {
        setError(
          `Routine '${routineName}' has an invalid 'checklist' attribute.`,
        );
        return;
      }

      const newSteps: RoutineStepConfig[] = checklistPlists.map(
        (plist: any[]) => {
          const item = plistToObject(plist);
          const isMandatory =
            String(item.is_mandatory).toLowerCase() === "true";

          return {
            id: generateStepId(),
            name: item.name,
            optional: !isMandatory,
            action: item.default_action
              ? hyArrayToString(item.default_action)
              : undefined,
          };
        },
      );

      onConfigChange({
        ...config,
        entityName: selectedRoutine.name,
        category: selectedRoutine.category,
        name: selectedRoutine.name,
        steps: newSteps,
        completionCriteria: { type: "all_required" },
      });
    },
    [availableRoutines, config, onConfigChange],
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
            <option
              key={`${routine.category}:${routine.name}`}
              value={routine.name}
            >
              {routine.name} ({routine.category})
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
