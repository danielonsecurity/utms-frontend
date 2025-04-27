import { useState, useEffect } from "react";
import { Variable } from "../../types/variables";
import { variablesApi } from "../../api/variablesApi";
import { DynamicExpressionEditor } from "../../components/shared/DynamicExpressionEditor";
import "./VariableCard.css";

interface VariableCardProps {
  variableKey: string;
  value: Variable;
  onUpdate: () => void;
}

export const VariableCard = ({
  variableKey,
  value,
  onUpdate,
}: VariableCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(variableKey);
  const [editedValue, setEditedValue] = useState(String(value.value));

  // Determine if the variable has any dynamic fields
  const hasDynamicFields = Object.keys(value.dynamic_fields || {}).length > 0;
  // Check if the main value field is dynamic
  const isMainValueDynamic = Boolean(value.dynamic_fields?.value);

  useEffect(() => {
    setEditedKey(variableKey);
  }, [variableKey]);

  const handleSave = async () => {
    try {
      // Rename key if changed
      if (editedKey !== variableKey) {
        await variablesApi.renameVariable(variableKey, editedKey);
      }
      // Only update the value if it's not dynamic and has changed
      if (!isMainValueDynamic && editedValue !== String(value.value)) {
        await variablesApi.updateVariableField(editedKey, "value", editedValue);
      }
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      alert("Failed to save changes: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${variableKey}"?`)) {
      try {
        await variablesApi.deleteVariable(variableKey);
        onUpdate();
      } catch (error) {
        alert("Failed to delete variable: " + (error as Error).message);
      }
    }
  };

  return (
    <div
      className={`variable-card card ${hasDynamicFields ? "variable-card--dynamic" : ""}`}
      data-variable={variableKey}
    >
      <div className="card__header">
        <h3 className="card__title">
          {isEditing ? (
            <input
              type="text"
              className="card__title-input"
              value={editedKey}
              onChange={(e) => setEditedKey(e.target.value)}
              autoFocus
            />
          ) : (
            editedKey
          )}
        </h3>

        {isEditing ? (
          <div className="variable-card__edit-buttons">
            <button
              className="btn btn--icon btn--save"
              onClick={handleSave}
              title="Save changes"
            >
              <i className="material-icons">save</i>
            </button>
            <button
              className="btn btn--icon btn--cancel"
              onClick={() => {
                setIsEditing(false);
                setEditedKey(variableKey);
              }}
              title="Cancel changes"
            >
              <i className="material-icons">close</i>
            </button>
            <button
              className="btn btn--icon btn--delete"
              onClick={handleDelete}
              title="Delete variable"
            >
              <i className="material-icons">delete</i>
            </button>
          </div>
        ) : (
          <div className="variable-card__view-buttons">
            <button
              className="btn btn--icon btn--edit"
              onClick={() => setIsEditing(true)}
              title="Edit variable"
            >
              <i className="material-icons">edit</i>
            </button>
          </div>
        )}
      </div>

      <div className="card__body">
        <div className="variable-card__info">
          {/* Main value field */}
          {!isMainValueDynamic ? (
            <div className="variable-value">
              <span className="variable-value__label">Value:</span>
              {isEditing ? (
                <input
                  type="text"
                  className="variable-value__input"
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  style={{
                    fontFamily: "Courier New, Courier, monospace",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    flexGrow: 1,
                    border: "1px solid #bbdefb",
                  }}
                />
              ) : (
                <code className="variable-value__text">{value.value}</code>
              )}
            </div>
          ) : (
            <DynamicExpressionEditor
              value={value}
              onChange={async (newValue, fieldName) => {
                await variablesApi.updateVariableField(
                  editedKey,
                  fieldName,
                  newValue,
                );
                onUpdate();
              }}
              api={variablesApi}
              context="variable"
              readOnly={!isEditing}
              fieldName="value" // Specify which field we're editing
            />
          )}

          {/* Display other dynamic fields if they exist */}
          {Object.entries(value.dynamic_fields || {})
            .filter(([fieldName]) => fieldName !== "value") // Skip the main value field as it's handled above
            .map(([fieldName, fieldInfo]) => (
              <div key={fieldName} className="variable-dynamic-field">
                <DynamicExpressionEditor
                  value={value}
                  onChange={async (newValue, fieldName) => {
                    await variablesApi.updateVariableField(
                      editedKey,
                      fieldName,
                      newValue,
                    );
                    onUpdate();
                  }}
                  api={variablesApi}
                  context="variable"
                  readOnly={!isEditing}
                  fieldName={fieldName}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
