import { useState, useEffect } from "react";
import { dynamicApi } from "../../../api/dynamicApi";
import "./DynamicExpressions.css";

interface DynamicExpression {
  original: string;
  value: any;
  history: Array<{
    timestamp: string;
    value: any;
  }>;
}

interface DynamicExpressionCardProps {
  componentType: string;
  componentLabel: string;
  attribute: string;
  expression: DynamicExpression;
  onRefresh: () => void;
}

const DynamicExpressionCard: React.FC<DynamicExpressionCardProps> = ({
  componentType,
  componentLabel,
  attribute,
  expression,
  onRefresh,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      await dynamicApi.evaluate(componentType, componentLabel, attribute);
      onRefresh();
    } catch (error) {
      console.error("Evaluation failed:", error);
      alert("Failed to evaluate expression");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="card dynamic-expression-card">
      <div className="card__header">
        <h4 className="card__title">
          {componentType}.{componentLabel}.{attribute}
        </h4>
        <div className="dynamic-expression-card__controls">
          <button
            className={`btn btn--icon ${isEvaluating ? "btn--loading" : ""}`}
            onClick={handleEvaluate}
            disabled={isEvaluating}
            title="Re-evaluate expression"
          >
            <i className="material-icons">refresh</i>
          </button>
          <button
            className="btn btn--icon"
            onClick={() => setShowHistory(!showHistory)}
            title={showHistory ? "Hide history" : "Show history"}
          >
            <i className="material-icons">
              {showHistory ? "history_toggle_off" : "history"}
            </i>
          </button>
        </div>
      </div>

      <div className="card__body">
        <div className="dynamic-expression-card__content">
          <div className="dynamic-expression-card__row">
            <span className="dynamic-expression-card__label">Expression:</span>
            <code className="dynamic-expression-card__code">
              {expression.original}
            </code>
          </div>
          <div className="dynamic-expression-card__row">
            <span className="dynamic-expression-card__label">
              Current Value:
            </span>
            <span className="dynamic-expression-card__value">
              {JSON.stringify(expression.value)}
            </span>
          </div>

          {showHistory && expression.history.length > 0 && (
            <div className="dynamic-expression-card__history">
              <h5>Evaluation History</h5>
              <div className="dynamic-expression-card__history-list">
                {expression.history.map((record, index) => (
                  <div
                    key={index}
                    className="dynamic-expression-card__history-item"
                  >
                    <span className="dynamic-expression-card__timestamp">
                      {new Date(record.timestamp).toLocaleString()}
                    </span>
                    <span className="dynamic-expression-card__history-value">
                      {JSON.stringify(record.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DynamicExpressions = () => {
  const [expressions, setExpressions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const loadExpressions = async () => {
    try {
      setLoading(true);
      const data = await dynamicApi.getExpressions();
      setExpressions(data);
    } catch (error) {
      console.error("Failed to load expressions:", error);
      alert("Failed to load dynamic expressions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpressions();
  }, []);

  if (loading) {
    return <div className="loading">Loading dynamic expressions...</div>;
  }

  return (
    <div className="dynamic-expressions">
      <div className="dynamic-expressions__controls">
        <div className="dynamic-expressions__search">
          <i className="material-icons">search</i>
          <input
            type="text"
            placeholder="Filter expressions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value.toLowerCase())}
          />
        </div>
        <button
          className="btn btn--refresh"
          onClick={loadExpressions}
          title="Refresh all expressions"
        >
          <i className="material-icons">refresh</i>
          Refresh All
        </button>
      </div>

      <div className="dynamic-expressions__grid">
        {Object.entries(expressions).map(([type, components]) =>
          Object.entries(components as Record<string, any>).map(
            ([label, attributes]) =>
              Object.entries(attributes as Record<string, DynamicExpression>)
                .filter(([attr]) =>
                  filter
                    ? `${type}.${label}.${attr}`.toLowerCase().includes(filter)
                    : true,
                )
                .map(([attr, expr]) => (
                  <DynamicExpressionCard
                    key={`${type}.${label}.${attr}`}
                    componentType={type}
                    componentLabel={label}
                    attribute={attr}
                    expression={expr}
                    onRefresh={loadExpressions}
                  />
                )),
          ),
        )}
      </div>
    </div>
  );
};
