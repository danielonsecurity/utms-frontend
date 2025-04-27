import { useState, useEffect, useCallback } from "react";
import { variablesApi } from "../../api/variablesApi";
import { VariablesData } from "../../types/variables";
import { VariableCard } from "../../components/variables/VariableCard";
import { CreateVariableModal } from "../../components/variables/CreateVariableModal";

export const Variables = () => {
  const [variables, setVariables] = useState<VariablesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelSearch, setLabelSearch] = useState("");
  const [valueSearch, setValueSearch] = useState("");
  const [showDynamicOnly, setShowDynamicOnly] = useState(false);
  const [sortType, setSortType] = useState("label-asc");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadVariables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await variablesApi.getVariables();
      console.log("variables.data=", data);
      setVariables(data);
    } catch (error) {
      const errorMessage = (error as Error).message || "Unknown error";
      setError(`Failed to load variables: ${errorMessage}`);
      console.error("Failed to load variables:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  const filteredAndSortedVariables = variables
    ? Object.entries(variables)
        .filter(([key, value]) => {
          // Label search
          const matchesLabel = key
            .toLowerCase()
            .includes(labelSearch.toLowerCase());

          // Value search (both original and evaluated)
          const originalValue = value.value;
          const matchesValue = String(originalValue)
            .toLowerCase()
            .includes(valueSearch.toLowerCase());

          // Dynamic filter - check if any dynamic fields exist
          const hasDynamicFields =
            Object.keys(value.dynamic_fields || {}).length > 0;
          const matchesDynamicFilter = !showDynamicOnly || hasDynamicFields;

          return matchesLabel && matchesValue && matchesDynamicFilter;
        })
        .sort(([labelA], [labelB]) => {
          switch (sortType) {
            case "label-asc":
              return labelA.localeCompare(labelB);
            case "label-desc":
              return labelB.localeCompare(labelA);
            default:
              return 0;
          }
        })
    : [];

  return (
    <div className="variables">
      <div className="variables__controls">
        <button
          className="btn btn--create"
          onClick={() => setIsModalOpen(true)}
        >
          <i className="material-icons">add</i>Create Variable
        </button>
        <div className="variables__search">
          <div className="variables__search-field">
            <i className="material-icons variables__search-icon">label</i>
            <input
              type="text"
              className="variables__search-input"
              placeholder="Search by label..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
            />
          </div>
          <div className="variables__search-field">
            <i className="material-icons variables__search-icon">title</i>
            <input
              type="text"
              className="variables__search-input"
              placeholder="Search by value..."
              value={valueSearch}
              onChange={(e) => setValueSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="variables__controls-row">
          <div className="variables__filters">
            <label className="variables__dynamic-toggle">
              <input
                type="checkbox"
                checked={showDynamicOnly}
                onChange={() => setShowDynamicOnly(!showDynamicOnly)}
              />
              Show Dynamic Only
            </label>
          </div>

          <div className="sort">
            <select
              className="sort__select"
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
            >
              <option value="label-asc">Label A-Z</option>
              <option value="label-desc">Label Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="variables__loading">
          <div className="spinner"></div>
          <p>Loading variables...</p>
        </div>
      ) : error ? (
        <div className="variables__error">
          <i className="material-icons">error</i>
          <p>{error}</p>
          <button className="btn" onClick={loadVariables}>
            Retry
          </button>
        </div>
      ) : filteredAndSortedVariables.length === 0 ? (
        <div className="variables__empty">
          <p>
            {labelSearch || valueSearch || showDynamicOnly
              ? "No variables match your filters."
              : "No variables found."}
          </p>
          {(labelSearch || valueSearch || showDynamicOnly) && (
            <button
              className="btn"
              onClick={() => {
                setLabelSearch("");
                setValueSearch("");
                setShowDynamicOnly(false);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="variables__grid">
          {filteredAndSortedVariables.map(([key, value]) => (
            <VariableCard
              key={key}
              variableKey={key}
              value={value}
              onUpdate={loadVariables}
            />
          ))}
        </div>
      )}

      {/* Commented out as per your instruction to ignore the modal for now */}
      {/* <CreateVariableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={loadVariables}
      /> */}
    </div>
  );
};
