import { useState, useEffect } from "react";
import { ConfigValue } from "../../types/config";
import { configApi } from "../../api/configApi";
import { DynamicExpressionEditor } from "../../components/shared/DynamicExpressionEditor";
import "./ConfigCard.css";

interface ConfigCardProps {
  configKey: string;
  value: ConfigValue;
  onUpdate: () => void;
}

export const ConfigCard = ({ configKey, value, onUpdate }: ConfigCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(configKey);
  const [editedValue, setEditedValue] = useState(String(value.value));

  useEffect(() => {
    setEditedKey(configKey);
  }, [configKey]);

  const handleSave = async () => {
    try {
      // Rename key if changed
      if (editedKey !== configKey) {
        await configApi.renameConfigKey(configKey, editedKey);
      }
      if (!value.is_dynamic && editedValue !== String(value.value)) {
        await configApi.updateConfig(editedKey, editedValue);
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

  return (
    <div
      className={`config-card card ${value.is_dynamic ? "config-card--dynamic" : ""}`}
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

        {/* Simplified controls structure */}
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
          {/* For static values, use direct editing */}
          {!value.is_dynamic ? (
            <div className="config-value">
              <span className="config-value__label">Value:</span>
              {isEditing ? (
                <input
                  type="text"
                  className="config-value__input"
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
                <code className="config-value__text">{value.value}</code>
              )}
            </div>
          ) : (
            /* For dynamic values, use the DynamicExpressionEditor */
            <DynamicExpressionEditor
              value={{
                ...value,
                key: editedKey,
              }}
              onChange={async (newValue) => {
                await configApi.updateConfig(editedKey, newValue);
                onUpdate();
              }}
              context="config"
              readOnly={!isEditing}
            />
          )}
        </div>
      </div>
    </div>
  );
};
