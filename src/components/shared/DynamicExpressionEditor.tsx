import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { createPortal } from "react-dom";
import { DynamicValue } from "../../types/common";
import { configApi } from "../../api/configApi";
import "./DynamicExpressionEditor.css";

// Define Hy/Lisp language configuration
const hyLanguageConfig = {
  comments: {
    lineComment: ";",
    blockComment: ["#|", "|#"],
  },
  brackets: [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: "{", close: "}" },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: "{", close: "}" },
    { open: '"', close: '"' },
  ],
};

// Define syntax highlighting rules
const hyTokensProvider = {
  defaultToken: "",
  tokenizer: {
    root: [
      // Comments
      [/;.*$/, "comment"],
      [/#\|/, "comment", "@comment"],

      // Strings
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // Numbers
      [/[0-9]+([.][0-9]+)?/, "number"],

      // Keywords
      [/\b(defn|def|if|when|do|let|import|require|quote|lambda)\b/, "keyword"],

      // Brackets
      [/[$$$$$$$$\{\}]/, "@brackets"],

      // Operators
      [/[+\-*/<>=!&|]+/, "operator"],

      // Identifiers
      [/[a-zA-Z_][a-zA-Z0-9_\-]*/, "identifier"],
    ],

    comment: [
      [/[^|#]+/, "comment"],
      [/#\|/, "comment", "@push"],
      [/\|#/, "comment", "@pop"],
      [/[|#]/, "comment"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],
  },
};

export const DynamicExpressionEditor = ({
  value,
  onChange,
  context = "general",
  readOnly = false,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatedValue, setEvaluatedValue] = useState<string>(
    String(value.value),
  );
  const [expression, setExpression] = useState(
    value.is_dynamic ? value.original || "" : String(value.value),
  );
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      const result = await configApi.evaluateExpression(value.key, expression);
      setEvaluatedValue(String(result.value));
      setEvaluationResult(String(result.value));
    } catch (error) {
      setEvaluationResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setExpression(value.original || String(value.value));
    setEvaluationResult(null);
  };

  return (
    <div className="dynamic-expression">
      <div className="dynamic-expression__header">
        <div className="dynamic-expression__value-container">
          <span className="dynamic-expression__label">Value:</span>
          <code className="dynamic-expression__evaluated">
            {evaluatedValue}
          </code>

          {/* Code button for dynamic expressions */}
          {value.is_dynamic && (
            <button
              className="btn btn--icon btn--code"
              onClick={() => setIsModalOpen(true)}
              title="View/Edit Expression"
              disabled={readOnly}
            >
              <i className="material-icons">code</i>
            </button>
          )}
        </div>
      </div>

      {/* For non-dynamic values in edit mode */}
      {!value.is_dynamic && !readOnly && (
        <div className="dynamic-expression__edit-controls">
          <button
            className="btn btn--small btn--edit-value"
            onClick={() => setIsModalOpen(true)}
          >
            Edit Value
          </button>
        </div>
      )}

      {isModalOpen &&
        createPortal(
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
                  {value.is_dynamic ? "Edit Expression" : "Edit Value"}:{" "}
                  {value.key}
                </h2>
                <span className="modal__close" onClick={handleClose}>
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
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <Editor
                      height="100%"
                      defaultLanguage={value.is_dynamic ? "hy" : "plaintext"}
                      value={expression}
                      onChange={(newValue) => setExpression(newValue || "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        readOnly: readOnly,
                        theme: "vs-dark",
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        scrollBeyondLastLine: false,
                        renderWhitespace: "all",
                        bracketPairColorization: {
                          enabled: true,
                        },
                        autoClosingBrackets: "always",
                        matchBrackets: "always",
                        folding: true,
                        lineDecorationsWidth: 5,
                        padding: { top: 10 },
                      }}
                      beforeMount={(monaco) => {
                        if (value.is_dynamic) {
                          monaco.languages.register({ id: "hy" });
                          monaco.languages.setLanguageConfiguration(
                            "hy",
                            hyLanguageConfig,
                          );
                          monaco.languages.setMonarchTokensProvider(
                            "hy",
                            hyTokensProvider,
                          );

                          monaco.editor.defineTheme("hyTheme", {
                            base: "vs-dark",
                            inherit: true,
                            rules: [
                              {
                                token: "comment",
                                foreground: "6A9955",
                                fontStyle: "italic",
                              },
                              { token: "string", foreground: "CE9178" },
                              { token: "number", foreground: "B5CEA8" },
                              {
                                token: "keyword",
                                foreground: "569CD6",
                                fontStyle: "bold",
                              },
                              { token: "operator", foreground: "D4D4D4" },
                              { token: "identifier", foreground: "9CDCFE" },
                              { token: "brackets", foreground: "FFD700" },
                            ],
                            colors: {
                              "editor.background": "#1E1E1E",
                              "editor.foreground": "#D4D4D4",
                              "editor.lineHighlightBackground": "#2F3337",
                              "editorCursor.foreground": "#FFFFFF",
                              "editor.selectionBackground": "#264F78",
                            },
                          });
                        }
                      }}
                      onMount={(editor, monaco) => {
                        editor.focus();
                        if (value.is_dynamic) {
                          monaco.editor.setTheme("hyTheme");
                        }
                      }}
                    />
                  </div>

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
                  onClick={handleClose}
                >
                  Cancel
                </button>
                {value.is_dynamic && (
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
                )}
                <button
                  className="modal__btn modal__btn--create"
                  onClick={async () => {
                    try {
                      await onChange(expression);
                      setIsModalOpen(false);
                      setEvaluationResult(null);
                    } catch (error) {
                      alert(`Failed to save: ${(error as Error).message}`);
                    }
                  }}
                  disabled={readOnly}
                >
                  <i className="material-icons">save</i>
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
