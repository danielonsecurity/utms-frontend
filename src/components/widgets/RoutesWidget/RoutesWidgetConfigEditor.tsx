// src/widgets/Routes/RoutesConfigEditor.tsx
import React, { useState, useCallback /*, useEffect */ } from "react"; // useEffect might not be needed if no fav list
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import {
  FPTFLocation,
  LocationsResponse,
  RoutesWidgetConfig,
  API_BASE_URL,
} from "../Routes/dbApiTypes"; // Or from shared dbApiTypes

type StationFieldToSet = "fromStation" | "toStation";

export const RoutesConfigEditor: React.FC<
  WidgetConfigComponentProps<RoutesWidgetConfig>
> = ({ config, onConfigChange }) => {
  const [stationSearchTerm, setStationSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FPTFLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [settingStationFor, setSettingStationFor] =
    useState<StationFieldToSet | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;
    if (type === "number") processedValue = parseInt(value, 10) || 0;
    onConfigChange({ ...config, [name]: processedValue });
  };

  const handleStationSearch = useCallback(
    async (fieldToSet: StationFieldToSet) => {
      if (!stationSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      setSearchError(null);
      setSearchResults([]);
      setSettingStationFor(fieldToSet); // Remember which field we are searching for

      try {
        const response = await fetch(
          `${API_BASE_URL}/locations?query=${encodeURIComponent(stationSearchTerm)}&results=5&fuzzy=true`,
        ); // Fewer results for direct selection
        if (!response.ok) {
          throw new Error("Search Failed");
        }
        const data: LocationsResponse = await response.json();
        setSearchResults(
          data.filter((loc) => loc.type === "station" || loc.type === "stop") ||
            [],
        );
      } catch (error) {
        console.error("Station search failed:", error);
        setSearchError(
          error instanceof Error ? error.message : "Search failed",
        );
      } finally {
        setSearchLoading(false);
      }
    },
    [stationSearchTerm],
  );

  const selectStation = (station: FPTFLocation) => {
    if (settingStationFor && station.id && station.name) {
      onConfigChange({
        ...config,
        [settingStationFor]: { id: station.id, name: station.name },
      });
      setStationSearchTerm(""); // Clear search
      setSearchResults([]); // Clear results
      setSettingStationFor(null); // Clear field being set
    }
  };

  const clearStation = (fieldToClear: StationFieldToSet) => {
    onConfigChange({ ...config, [fieldToClear]: null });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "5px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "3px",
    fontWeight: "bold",
  };
  const searchInputStyle: React.CSSProperties = { flexGrow: 1, padding: "8px" };
  const searchButtonStyle: React.CSSProperties = { padding: "8px 12px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor="routeName" style={labelStyle}>
          Widget Name:
        </label>
        <input
          type="text"
          id="routeName"
          name="name"
          value={config.name}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>

      {/* From Station Configuration */}
      <div>
        <label htmlFor="fromStationName" style={labelStyle}>
          From Station:
        </label>
        {config.fromStation ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "5px",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <span style={{ flexGrow: 1 }}>
              {config.fromStation.name} ({config.fromStation.id})
            </span>
            <button
              onClick={() => clearStation("fromStation")}
              style={{ color: "red", fontSize: "0.9em" }}
            >
              Change
            </button>
          </div>
        ) : (
          <p>Not set. Search below.</p>
        )}
        {!config.fromStation && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <input
              type="text"
              placeholder="Search From Station"
              value={stationSearchTerm}
              onChange={(e) => setStationSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
            <button
              onClick={() => handleStationSearch("fromStation")}
              disabled={searchLoading && settingStationFor !== "fromStation"}
              style={searchButtonStyle}
            >
              {searchLoading && settingStationFor === "fromStation"
                ? "..."
                : "Search From"}
            </button>
          </div>
        )}
      </div>

      {/* To Station Configuration */}
      <div>
        <label htmlFor="toStationName" style={labelStyle}>
          To Station:
        </label>
        {config.toStation ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "5px",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <span style={{ flexGrow: 1 }}>
              {config.toStation.name} ({config.toStation.id})
            </span>
            <button
              onClick={() => clearStation("toStation")}
              style={{ color: "red", fontSize: "0.9em" }}
            >
              Change
            </button>
          </div>
        ) : (
          <p>Not set. Search below.</p>
        )}
        {!config.toStation && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <input
              type="text"
              placeholder="Search To Station"
              value={stationSearchTerm}
              onChange={(e) => setStationSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
            <button
              onClick={() => handleStationSearch("toStation")}
              disabled={searchLoading && settingStationFor !== "toStation"}
              style={searchButtonStyle}
            >
              {searchLoading && settingStationFor === "toStation"
                ? "..."
                : "Search To"}
            </button>
          </div>
        )}
      </div>

      {/* Search Results (common for From/To) */}
      {settingStationFor && searchLoading && <p>Searching...</p>}
      {settingStationFor && searchError && (
        <p style={{ color: "red" }}>{searchError}</p>
      )}
      {settingStationFor && !searchLoading && searchResults.length > 0 && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: "5px",
            marginTop: "-10px",
            marginBottom: "10px",
          }}
        >
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
            Select for '{settingStationFor === "fromStation" ? "From" : "To"}':
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {searchResults.map(
              (s) =>
                s.id &&
                s.name && (
                  <li
                    key={`search-${s.id}`}
                    onClick={() => selectStation(s)}
                    style={{
                      padding: "6px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f0f0f0")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {s.name} ({s.id})
                  </li>
                ),
            )}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="resultsCount" style={labelStyle}>
          Number of Routes to Show:
        </label>
        <input
          type="number"
          id="resultsCount"
          name="resultsCount"
          value={config.resultsCount}
          onChange={handleChange}
          min="1"
          max="10"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="refreshIntervalSeconds" style={labelStyle}>
          Refresh Interval (seconds):
        </label>
        <input
          type="number"
          id="refreshIntervalSeconds"
          name="refreshIntervalSeconds"
          value={config.refreshIntervalSeconds}
          onChange={handleChange}
          min="60"
          style={inputStyle}
        />
      </div>
    </div>
  );
};
