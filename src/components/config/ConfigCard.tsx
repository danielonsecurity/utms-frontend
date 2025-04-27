// src/components/config/ConfigCard.tsx
import { useState, useEffect } from "react";
import { Config, FieldType } from "../../types/config";
import { configApi } from "../../api/configApi";
import "./ConfigCard.css";

interface ConfigCardProps {
  configKey: string;
  value: Config;
  onUpdate: () => void;
}

export const ConfigCard = ({ configKey, value, onUpdate }: ConfigCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(configKey);
  const [editedValue, setEditedValue] = useState(String(value.value));
  const [editedType, setEditedType] = useState<FieldType>(
    value.type as FieldType,
  );
  const [enumChoices, setEnumChoices] = useState<string[]>(
    value.enum_choices || [],
  );
  const [newEnumChoice, setNewEnumChoice] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [expression, setExpression] = useState(
    value.is_dynamic && value.original ? value.original : String(value.value),
  );

  // Determine if the config value is dynamic
  const isDynamic = value.is_dynamic;

  useEffect(() => {
    setEditedKey(configKey);
    setEditedValue(String(value.value));
    setEditedType(value.type as FieldType);
    setEnumChoices(value.enum_choices || []);
    setExpression(
      value.is_dynamic && value.original ? value.original : String(value.value),
    );
  }, [configKey, value]);

  const handleSave = async () => {
    try {
      // Rename key if changed
      if (editedKey !== configKey) {
        await configApi.renameConfigKey(configKey, editedKey);
      }

      // Only update the value if it's not dynamic or if type has changed
      if (!isDynamic || editedType !== value.type) {
        let processedValue = editedValue;

        // Convert value based on type
        if (editedType === "integer") {
          processedValue = parseInt(editedValue);
        } else if (editedType === "decimal") {
          processedValue = parseFloat(editedValue);
        } else if (editedType === "boolean") {
          processedValue = editedValue.toLowerCase() === "true";
        }

        await configApi.updateConfigField(
          editedKey,
          "value",
          processedValue,
          editedType,
          {
            enum_choices: editedType === "enum" ? enumChoices : undefined,
          },
        );
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      alert("Failed to save changes: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${configKey}"?`)) {
      try {
        await configApi.deleteConfig(configKey);
        onUpdate();
      } catch (error) {
        alert("Failed to delete config: " + (error as Error).message);
      }
    }
  };

  const addEnumChoice = () => {
    if (newEnumChoice && !enumChoices.includes(newEnumChoice)) {
      setEnumChoices([...enumChoices, newEnumChoice]);
      setNewEnumChoice("");
    }
  };

  const removeEnumChoice = (choice: string) => {
    setEnumChoices(enumChoices.filter((c) => c !== choice));
  };

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      const result = await configApi.evaluateFieldExpression(
        editedKey,
        "value",
        expression,
      );
      setEvaluationResult(String(result.value));
    } catch (error) {
      setEvaluationResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveExpression = async () => {
    try {
      await configApi.updateConfigField(
        editedKey,
        "value",
        expression,
        "code",
        { is_dynamic: true, original: expression },
      );
      setIsModalOpen(false);
      setEvaluationResult(null);
      onUpdate();
    } catch (error) {
      alert(`Failed to save: ${(error as Error).message}`);
    }
  };

  // Render input based on type
  const renderValueInput = () => {
    if (!isEditing) {
      return renderValue();
    }

    switch (editedType) {
      case "boolean":
        return (
          <select
            className="config-value__input"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case "integer":
      case "decimal":
        return (
          <input
            type="number"
            className="config-value__input"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            step={editedType === "decimal" ? "0.01" : "1"}
          />
        );
      case "enum":
        return (
          <div className="enum-editor">
            <select
              className="config-value__input"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
            >
              {enumChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
            <div className="enum-choices">
              <h4>Enum Choices:</h4>
              <ul>
                {enumChoices.map((choice) => (
                  <li key={choice}>
                    {choice}
                    <button
                      className="btn btn--icon btn--small"
                      onClick={() => removeEnumChoice(choice)}
                    >
                      <i className="material-icons">remove</i>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="enum-add">
                <input
                  type="text"
                  value={newEnumChoice}
                  onChange={(e) => setNewEnumChoice(e.target.value)}
                  placeholder="New choice..."
                />
                <button
                  className="btn btn--icon btn--small"
                  onClick={addEnumChoice}
                >
                  <i className="material-icons">add</i>
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="config-value__input"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
          />
        );
    }
  };

  // Render value based on its type
  const renderValue = () => {
    const val = value.value;

    switch (value.type) {
      case "boolean":
        return <span className="boolean-value">{val ? "true" : "false"}</span>;
      case "code":
        return (
          <div className="code-value">
            <div className="code-expression">{value.original}</div>
            <div className="code-result">→ {String(val)}</div>
          </div>
        );
      case "list":
        return <pre>{JSON.stringify(val, null, 2)}</pre>;
      case "dict":
        return <pre>{JSON.stringify(val, null, 2)}</pre>;
      case "enum":
        return (
          <div className="enum-value">
            <span>{val}</span>
            {isEditing && (
              <div className="enum-choices-info">
                <small>Choices: {(value.enum_choices || []).join(", ")}</small>
              </div>
            )}
          </div>
        );
      default:
        return <code className="config-value__text">{String(val)}</code>;
    }
  };

  // Render appropriate expression editor for dynamic values
  const renderExpressionEditor = () => {
    return (
      <div className="dynamic-expression">
        <div className="dynamic-expression__header">
          <div className="dynamic-expression__value-container">
            <span className="dynamic-expression__label">Value:</span>
            <code className="dynamic-expression__evaluated">{value.value}</code>
            <button
              className="btn btn--icon btn--code"
              onClick={() => setIsModalOpen(true)}
              title="View/Edit Expression"
              disabled={!isEditing}
            >
              <i className="material-icons">code</i>
            </button>
          </div>
        </div>
        <div className="dynamic-expression__original">
          <code>{value.original}</code>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`config-card card ${isDynamic ? "config-card--dynamic" : ""}`}
      data-config={configKey}
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
          <div className="config-card__edit-buttons">
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
                setEditedKey(configKey);
                setEditedValue(String(value.value));
                setEditedType(value.type as FieldType);
              }}
              title="Cancel changes"
            >
              <i className="material-icons">close</i>
            </button>
            <button
              className="btn btn--icon btn--delete"
              onClick={handleDelete}
              title="Delete config"
            >
              <i className="material-icons">delete</i>
            </button>
          </div>
        ) : (
          <div className="config-card__view-buttons">
            <button
              className="btn btn--icon btn--edit"
              onClick={() => setIsEditing(true)}
              title="Edit config"
            >
              <i className="material-icons">edit</i>
            </button>
          </div>
        )}
      </div>

      <div className="card__body">
        <div className="config-card__info">
          {/* Type selector */}
          {isEditing && (
            <div className="config-type">
              <label className="config-type__label">Type:</label>
              <select
                className="config-type__select"
                value={editedType}
                onChange={(e) => setEditedType(e.target.value as FieldType)}
                disabled={isDynamic}
              >
                <option value="string">String</option>
                <option value="integer">Integer</option>
                <option value="decimal">Decimal</option>
                <option value="boolean">Boolean</option>
                <option value="timestamp">Timestamp</option>
                <option value="timelength">Time Length</option>
                <option value="timerange">Time Range</option>
                <option value="list">List</option>
                <option value="dict">Dictionary</option>
                <option value="enum">Enum</option>
                <option value="code">Code</option>
              </select>
            </div>
          )}

          {/* Type badge for view mode */}
          {!isEditing && (
            <div className="config-type-badge">
              {value.type}
              {isDynamic && <span className="dynamic-badge">⚡</span>}
            </div>
          )}

          {/* Main value field */}
          {!isDynamic ? (
            <div className="config-value">
              <span className="config-value__label">Value:</span>
              {renderValueInput()}
            </div>
          ) : (
            renderExpressionEditor()
          )}
        </div>
      </div>

      {/* Modal for editing expressions */}
      {isModalOpen && (
        <div className="modal" style={{ display: "block" }}>
          <div
            className="modal__content"
            style={{
              width: "90%",
              maxWidth: "1000px",
              height: "80vh",
              display: "flex",
              flexDirection: "column",
              margin: "5vh auto",
            }}
          >
            <div className="modal__header">
              <h2 className="modal__title">
                Edit Expression: {editedKey}
                <span className="type-badge">{value.type}</span>
              </h2>
              <span
                className="modal__close"
                onClick={() => {
                  setIsModalOpen(false);
                  setEvaluationResult(null);
                }}
              >
                &times;
              </span>
            </div>

            <div
              className="modal__body"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                padding: "20px",
              }}
            >
              <div
                className="editor-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  gap: "1rem",
                }}
              >
                <textarea
                  style={{ flex: 1, fontFamily: "monospace" }}
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  disabled={!isEditing}
                />

                {evaluationResult !== null && (
                  <div className="evaluation-output">
                    <div className="evaluation-output__header">
                      <span className="evaluation-output__title">
                        Evaluation Result
                      </span>
                      <button
                        className="evaluation-output__clear"
                        onClick={() => setEvaluationResult(null)}
                        title="Clear result"
                      >
                        <i className="material-icons">clear</i>
                      </button>
                    </div>
                    <div className="evaluation-output__content">
                      {evaluationResult}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal__footer">
              <button
                className="modal__btn modal__btn--cancel"
                onClick={() => {
                  setIsModalOpen(false);
                  setEvaluationResult(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`modal__btn modal__btn--evaluate ${
                  isEvaluating ? "btn--loading" : ""
                }`}
                onClick={handleEvaluate}
                disabled={isEvaluating}
              >
                <i className="material-icons">play_arrow</i>
                Evaluate
              </button>
              <button
                className="modal__btn modal__btn--create"
                onClick={handleSaveExpression}
                disabled={!isEditing}
              >
                <i className="material-icons">save</i>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
