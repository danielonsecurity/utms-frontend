import { useState, useEffect, useCallback } from "react";
import { configApi } from "../../api/configApi";
import { ConfigData } from "../../types/config";
import { ConfigCard } from "../../components/config/ConfigCard";
import { CreateConfigModal } from "../../components/config/CreateConfigModal";

export const Config = () => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelSearch, setLabelSearch] = useState("");
  const [valueSearch, setValueSearch] = useState("");
  const [showDynamicOnly, setShowDynamicOnly] = useState(false);
  const [sortType, setSortType] = useState("label-asc");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await configApi.getConfig();
      console.log("config.data=", data);
      setConfig(data);
    } catch (error) {
      const errorMessage = (error as Error).message || "Unknown error";
      setError(`Failed to load config: ${errorMessage}`);
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const filteredAndSortedConfig = config
    ? Object.entries(config)
        .filter(([key]) => !key.endsWith("-choices"))
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

          // Dynamic filter
          const matchesDynamicFilter = !showDynamicOnly || value.is_dynamic;

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
    <div className="config">
      <div className="config__controls">
        <button
          className="btn btn--create"
          onClick={() => setIsModalOpen(true)}
        >
          <i className="material-icons">add</i>Create Config
        </button>
        <div className="config__search">
          <div className="config__search-field">
            <i className="material-icons config__search-icon">label</i>
            <input
              type="text"
              className="config__search-input"
              placeholder="Search by label..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
            />
          </div>
          <div className="config__search-field">
            <i className="material-icons config__search-icon">title</i>
            <input
              type="text"
              className="config__search-input"
              placeholder="Search by value..."
              value={valueSearch}
              onChange={(e) => setValueSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="config__controls-row">
          <div className="config__filters">
            <label className="config__dynamic-toggle">
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
        <div className="config__loading">
          <div className="spinner"></div>
          <p>Loading configuration...</p>
        </div>
      ) : error ? (
        <div className="config__error">
          <i className="material-icons">error</i>
          <p>{error}</p>
          <button className="btn" onClick={loadConfig}>
            Retry
          </button>
        </div>
      ) : filteredAndSortedConfig.length === 0 ? (
        <div className="config__empty">
          <p>
            {labelSearch || valueSearch || showDynamicOnly
              ? "No configuration items match your filters."
              : "No configuration items found."}
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
        <div className="config__grid">
          {filteredAndSortedConfig.map(([key, value]) => (
            <ConfigCard
              key={key}
              configKey={key}
              value={value}
              onUpdate={loadConfig}
            />
          ))}
        </div>
      )}

      <CreateConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={loadConfig}
      />
    </div>
  );
};
