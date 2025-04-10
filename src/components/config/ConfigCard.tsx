// src/components/config/ConfigCard.tsx
import { useState } from "react";
import { ConfigValue } from "../../types/config";
import { configApi } from "../../api/configApi";

interface ConfigCardProps {
  configKey: string;
  value: ConfigValue;
  onUpdate: () => void;
}

export const ConfigCard = ({ configKey, value, onUpdate }: ConfigCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showOriginalCode, setShowOriginalCode] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatedValue, setEvaluatedValue] = useState<string | null>(
    value.is_dynamic ? String(value.value) : null,
  );
  const [editedConfig, setEditedConfig] = useState({
    key: configKey,
    value: value.is_dynamic
      ? value.original || String(value.value)
      : String(value.value),
  });

  const handleSave = async () => {
    try {
      // Rename key if changed
      if (editedConfig.key !== configKey) {
        await configApi.renameConfigKey(configKey, editedConfig.key);
      }

      // Update value
      const result = await configApi.updateConfig(
        editedConfig.key,
        editedConfig.value,
      );

      // Update local state with the new value
      setEvaluatedValue(result.is_dynamic ? String(result.value) : null);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      alert("Failed to save changes: " + (error as Error).message);
    }
  };

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      const result = await configApi.evaluateExpression(
        configKey,
        editedConfig.value,
      );
      if (result.is_dynamic) {
        setEvaluatedValue(String(result.value));
      }
    } catch (error) {
      alert("Failed to evaluate expression: " + (error as Error).message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const renderValueContent = () => {
    const displayValue = value.is_dynamic
      ? evaluatedValue || String(value.value)
      : String(value.value);
    const originalValue = value.original || editedConfig.value;
    const isDynamicExpression = editedConfig.value.startsWith("(");

    if (value.is_dynamic || isDynamicExpression) {
      return (
        <>
          <div className="config-card__row">
            <span className="config-card__label">Value:</span>
            <span className="config-card__value">
              {displayValue}
              {isEditing && (
                <button
                  className={`btn btn--icon btn--evaluate ${isEvaluating ? "btn--loading" : ""}`}
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  title="Evaluate expression"
                >
                  <i className="material-icons">play_arrow</i>
                </button>
              )}
            </span>

            <button
              className="btn btn--icon btn--code-toggle"
              onClick={() => setShowOriginalCode(!showOriginalCode)}
              title={showOriginalCode ? "Hide Code" : "Show Code"}
            >
              <i className="material-icons">
                {showOriginalCode ? "code_off" : "code"}
              </i>
            </button>
          </div>

          {showOriginalCode && (
            <div className="config-card__row config-card__row--code">
              <span className="config-card__label">Expression:</span>
              {isEditing ? (
                <input
                  type="text"
                  className="config-card__expression-input"
                  value={editedConfig.value}
                  onChange={(e) =>
                    setEditedConfig((prev) => ({
                      ...prev,
                      value: e.target.value,
                    }))
                  }
                />
              ) : (
                <code className="config-card__expression">{originalValue}</code>
              )}
            </div>
          )}
        </>
      );
    }

    return (
      <div className="config-card__row">
        <span className="config-card__label">Value:</span>
        {isEditing ? (
          <input
            type="text"
            className="config-card__value-input"
            value={editedConfig.value}
            onChange={(e) =>
              setEditedConfig((prev) => ({
                ...prev,
                value: e.target.value,
              }))
            }
          />
        ) : (
          <span className="config-card__value">{displayValue}</span>
        )}
      </div>
    );
  };

  return (
    <div className="config-card card" data-config={configKey}>
      <div className="card__header">
        <h3 className="card__title">
          {isEditing ? (
            <input
              type="text"
              className="card__title-input"
              value={editedConfig.key}
              onChange={(e) =>
                setEditedConfig((prev) => ({
                  ...prev,
                  key: e.target.value,
                }))
              }
            />
          ) : (
            editedConfig.key
          )}
        </h3>

        <div className="config-card__controls">
          <button
            className={`btn btn--icon btn--edit ${isEditing ? "hidden" : ""}`}
            data-action="edit"
            title="Edit config"
            onClick={() => setIsEditing(true)}
          >
            <i className="material-icons">edit</i>
          </button>
          <div
            className={`config-card__edit-controls ${isEditing ? "visible" : ""}`}
          >
            <button
              className="btn btn--icon btn--save"
              data-action="save"
              onClick={handleSave}
              title="Save changes"
            >
              <i className="material-icons">save</i>
            </button>
            <button
              className="btn btn--icon btn--cancel"
              data-action="cancel"
              onClick={() => {
                setIsEditing(false);
                setShowOriginalCode(false);
                setEditedConfig({
                  key: configKey,
                  value: value.is_dynamic
                    ? value.original || String(value.value)
                    : String(value.value),
                });
                setEvaluatedValue(
                  value.is_dynamic ? String(value.value) : null,
                );
              }}
              title="Cancel changes"
            >
              <i className="material-icons">close</i>
            </button>
          </div>
        </div>
      </div>

      <div className="card__body">
        <div className="config-card__info">{renderValueContent()}</div>
      </div>
    </div>
  );
};
