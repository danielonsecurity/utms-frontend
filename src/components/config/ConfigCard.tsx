import { useState, useEffect } from "react";
import { Config, FieldType } from "../../types/config";
import { configApi } from "../../api/configApi";
import {
  formatUtcIsoToLocalInput,
  generateHyDateTimeCode,
} from "../shared/utils.ts";
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
  const [editedList, setEditedList] = useState<string[]>([]);
  const [editedListItemType, setEditedListItemType] =
    useState<FieldType>("string");
  const [editedDateTimeLocal, setEditedDateTimeLocal] = useState("");

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
  const [codeUiMode, setCodeUiMode] = useState<"datetime" | "code">("code");
  const isDynamic = value.is_dynamic;

  useEffect(() => {
    setEditedKey(configKey);
    const currentType = value.type as FieldType;
    const originalCode = value.original;
    const isDynamicCode = value.is_dynamic && currentType === "code";
    const isDateTimePattern =
      isDynamicCode && originalCode?.trim().startsWith("(datetime ");

    if (isDateTimePattern) {
      setEditedType("code");
      setCodeUiMode("datetime");
      setEditedDateTimeLocal(formatUtcIsoToLocalInput(value.value));
      setEditedValue("");
      setEditedList([]);
      setExpression(originalCode || "");
    } else if (currentType === "code") {
      setEditedType("code");
      setCodeUiMode("code");
      setEditedValue(value.value ?? "");
      setExpression(originalCode || String(value.value) || "");
      setEditedDateTimeLocal("");
      setEditedList([]);
    } else if (currentType === "list" && Array.isArray(value.value)) {
      setEditedType("list");
      setCodeUiMode("code");
      setEditedList(value.value.map((item) => String(item)));
      setEditedValue("");
      setEditedDateTimeLocal("");
      setExpression("");
    } else {
      setEditedType(currentType);
      setCodeUiMode("code");
      setEditedValue(String(value.value ?? ""));
      setEditedList([]);
      setEditedDateTimeLocal("");
      setExpression(String(value.value ?? ""));
    }
    setEnumChoices(value.enum_choices || []);
  }, [configKey, value]);

  const handleListItemChange = (index: number, newValue: string) => {
    setEditedList((currentList) =>
      currentList.map((item, i) => (i === index ? newValue : item)),
    );
  };

  const handleAddListItem = () => {
    setEditedList((currentList) => [...currentList, ""]);
  };

  const handleRemoveListItem = (index: number) => {
    setEditedList((currentList) => currentList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      if (editedKey !== configKey) {
        await configApi.renameConfigKey(configKey, editedKey);
      }

      let valueToSave: any;
      let typeToSave = editedType;
      let isDynamicToSend = false;
      let originalToSend: string | undefined = undefined;
      if (editedType === "code" && codeUiMode === "datetime") {
        if (!editedDateTimeLocal) {
          alert("Cannot save empty date/time.");
          return;
        }
        const hyCode = generateHyDateTimeCode(editedDateTimeLocal);
        if (hyCode === null) {
          alert("Invalid date selected. Cannot save.");
          return;
        }
        let isoStringValue: string | null = null;
        try {
          const localDate = new Date(editedDateTimeLocal);
          if (isNaN(localDate.getTime())) throw new Error("Invalid date");
          isoStringValue = localDate.toISOString();
        } catch (e) {
          alert("Error converting date to standard format. Cannot save.");
          return;
        }

        valueToSave = isoStringValue;
        typeToSave = "code";
        isDynamicToSend = true;
        originalToSend = hyCode;
      } else if (editedType === "datetime") {
        if (!editedDateTimeLocal) {
          alert("Cannot save empty date/time.");
          return;
        }
        const hyCode = generateHyDateTimeCode(editedDateTimeLocal);
        if (hyCode === null) {
          alert("Invalid date selected. Cannot save.");
          return;
        }
        let isoStringValue: string | null = null;
        try {
          const localDate = new Date(editedDateTimeLocal);
          if (isNaN(localDate.getTime())) throw new Error("Invalid date");
          isoStringValue = localDate.toISOString();
        } catch (e) {
          alert("Error converting date to standard format. Cannot save.");
          return;
        }
        valueToSave = isoStringValue;
        typeToSave = "code";
        isDynamicToSend = true;
        originalToSend = hyCode;
      } else if (editedType === "code") {
        valueToSave = expression;
        typeToSave = "code";
        isDynamicToSend =
          typeof valueToSave === "string" && expression.trim().startsWith("(");
        originalToSend = isDynamicToSend ? expression : undefined;
      } else if (editedType === "list") {
        valueToSave = editedList;
        typeToSave = "list";
        isDynamicToSend = false;
        originalToSend = undefined;
      } else if (editedType === "integer") {
        const parsedInt = parseInt(editedValue, 10);
        if (isNaN(parsedInt)) {
          alert(`Invalid integer value: ${editedValue}`);
          return;
        }
        valueToSave = parsedInt;
        typeToSave = "integer";
        isDynamicToSend = false;
        originalToSend = undefined;
      } else if (editedType === "decimal") {
        const parsedFloat = parseFloat(editedValue);
        if (isNaN(parsedFloat)) {
          alert(`Invalid decimal value: ${editedValue}`);
          return;
        }
        valueToSave = parsedFloat;
        typeToSave = "decimal";
        isDynamicToSend = false;
        originalToSend = undefined;
      } else if (editedType === "boolean") {
        valueToSave = editedValue.toLowerCase() === "true";
        typeToSave = "boolean";
        isDynamicToSend = false;
        originalToSend = undefined;
      } else {
        valueToSave = editedValue;
        typeToSave = editedType;
        isDynamicToSend = false;
        originalToSend = undefined;
      }
      const typeChanged = typeToSave !== value.type;
      const dynamicChanged = isDynamicToSend !== value.is_dynamic;
      const originalChanged = originalToSend !== value.original;
      let needsSave = true;

      console.log("Saving field update:", {
        key: editedKey,
        value: valueToSave,
        type: typeToSave,
        is_dynamic: isDynamicToSend,
        original: originalToSend,
        enum_choices: typeToSave === "enum" ? enumChoices : undefined,
      });
      const apiOptions: any = {
        is_dynamic: isDynamicToSend,
      };
      if (originalToSend !== undefined) {
        apiOptions.original = originalToSend;
      }
      if (typeToSave === "enum" && enumChoices) {
        apiOptions.enum_choices = enumChoices;
      }

      await configApi.updateConfigField(
        editedKey,
        "value",
        valueToSave,
        typeToSave,
        apiOptions,
      );
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Save failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      let detail = message;
      try {
        const parsed = JSON.parse(message.substring(message.indexOf("{")));
        if (parsed && parsed.detail) {
          detail = parsed.detail;
        }
      } catch (_) {}
      alert("Failed to save changes: " + detail);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    const currentType = value.type as FieldType;
    const originalCode = value.original;
    const isDynamicCode = value.is_dynamic && currentType === "code";
    const isDateTimePattern =
      isDynamicCode && originalCode?.trim().startsWith("(datetime ");

    setEditedKey(configKey);
    if (isDateTimePattern) {
      setEditedType("code");
      setCodeUiMode("datetime");
      setEditedDateTimeLocal(formatUtcIsoToLocalInput(value.value));
      setEditedValue("");
      setEditedList([]);
      setExpression(originalCode || "");
    } else if (isDynamicCode) {
      setEditedType("code");
      setCodeUiMode("code");
      setExpression(originalCode || String(value.value) || "");
      setEditedValue(value.value ?? "");
      setEditedDateTimeLocal("");
      setEditedList([]);
    } else if (currentType === "list") {
      setEditedType("list");
    } else {
      setEditedType(currentType);
      setCodeUiMode("code");
      setEditedValue(String(value.value ?? ""));
      setEditedList([]);
      setEditedDateTimeLocal("");
      setExpression(String(value.value ?? ""));
    }
    setEnumChoices(value.enum_choices || []);
    setEvaluationResult(null);
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

  const handleTypeChange = (newType: FieldType) => {
    setEditedType(newType);
    if (newType === "datetime") {
      setCodeUiMode("datetime");
      if (
        !editedDateTimeLocal ||
        isNaN(new Date(editedDateTimeLocal).getTime())
      ) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        setEditedDateTimeLocal(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
      setEditedValue("");
      setExpression("");
    } else if (newType === "code") {
      setCodeUiMode("code");
      setExpression(value.original || String(value.value ?? ""));
      setEditedDateTimeLocal("");
      setEditedValue(String(value.value ?? ""));
    } else {
      setCodeUiMode("code");
      setEditedValue(String(value.value ?? ""));
      setEditedList(Array.isArray(value.value) ? value.value.map(String) : []);
      setEditedDateTimeLocal("");
      setExpression("");
    }
  };

  const handleDateTimeLocalChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setEditedDateTimeLocal(e.target.value);
  };

  const renderValueInput = () => {
    if (!isEditing) {
      return renderValue();
    }
    if (codeUiMode === "datetime") {
      return (
        <input
          type="datetime-local"
          className="config-value__input config-value__input--datetime"
          value={editedDateTimeLocal}
          onChange={handleDateTimeLocalChange}
        />
      );
    } else if (editedType === "code") {
      return (
        <div>
          <textarea
            className="config-value__input config-value__input--code"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            rows={3}
          />
          <button onClick={() => setIsModalOpen(true)} disabled={!isEditing}>
            Edit Code
          </button>
        </div>
      );
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
      case "list":
        return (
          <div className="list-editor">
            {editedList.map((item, index) => (
              <div key={index} className="list-item">
                <input
                  type="text"
                  className="list-item__input"
                  value={item}
                  onChange={(e) => handleListItemChange(index, e.target.value)}
                  placeholder={`Item ${index + 1}`}
                />
                <button
                  className="btn btn--icon btn--small btn--danger"
                  onClick={() => handleRemoveListItem(index)}
                  title="Remove item"
                >
                  <i className="material-icons">remove_circle_outline</i>
                </button>
              </div>
            ))}
            <button
              className="btn btn--small btn--add-item"
              onClick={handleAddListItem}
            >
              <i className="material-icons">add</i> Add Item
            </button>
          </div>
        );
      default:
        if (value.is_dynamic && value.original && editedType !== "datetime") {
          return (
            <input
              type="text"
              className="config-value__input"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
            />
          );
        } else {
          return (
            <input
              type="text"
              className="config-value__input"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
            />
          );
        }
    }
  };

  // Render value based on its type
  const renderValue = () => {
    const currentType = value.type as FieldType;
    const originalCode = value.original;
    const isDynamicCode = value.is_dynamic && currentType === "code";
    const isDateTimePattern =
      isDynamicCode && originalCode?.trim().startsWith("(datetime ");

    if (isDateTimePattern) {
      try {
        const dateObj = new Date(value.value);
        if (isNaN(dateObj.getTime())) return <span>Invalid Date Value</span>;
        return (
          <span className="datetime-value">{dateObj.toLocaleString()}</span>
        );
      } catch (e) {
        console.error("Error parsing/displaying date:", e);
        return <span>Error displaying date</span>;
      }
    } else if (isDynamicCode) {
      return (
        <div className="code-value">
          <div className="code-expression">{value.original}</div>
          <div className="code-result">→ {String(value.value ?? "N/A")}</div>
        </div>
      );
    }

    if (currentType === "list" && Array.isArray(value.value)) {
      return (
        <ul className="list-display">
          {value.value.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    const val = value.value;

    switch (currentType) {
      case "boolean":
        return <span className="boolean-value">{val ? "true" : "false"}</span>;
      case "code":
        return (
          <div className="code-value">
            <div className="code-expression">{value.original}</div>
            <div className="code-result">→ {String(val)}</div>
          </div>
        );
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
        return (
          <code className="config-value__text">
            {String(value.value ?? "")}
          </code>
        );
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
              onClick={handleCancel}
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
          {isEditing && (
            <div className="config-type">
              <label className="config-type__label">Type:</label>
              <select
                className="config-type__select"
                value={editedType}
                onChange={(e) => handleTypeChange(e.target.value as FieldType)}
              >
                <option value="string">String</option>
                <option value="integer">Integer</option>
                <option value="decimal">Decimal</option>
                <option value="boolean">Boolean</option>
                <option value="timestamp">Timestamp</option>
                <option value="timelength">Time Length</option>
                <option value="timerange">Time Range</option>
                <option value="datetime">Datetime</option>
                <option value="list">List</option>
                <option value="dict">Dictionary</option>
                <option value="enum">Enum</option>
                <option value="code">Code</option>
              </select>
            </div>
          )}

          {!isEditing && (
            <div className="config-type-badge">
              {value.type}
              {isDynamic && <span className="dynamic-badge">⚡</span>}
            </div>
          )}

          <div className="config-value">
            {isEditing ? renderValueInput() : renderValue()}
          </div>
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
