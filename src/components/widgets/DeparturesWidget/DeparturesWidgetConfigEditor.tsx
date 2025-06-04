// src/widgets/Transportation/TransportationConfigEditor.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { WidgetConfigComponentProps } from "../../../widgets/registry"; // Adjust path
import {
  FPTFLocation,
  LocationsResponse,
  API_BASE_URL,
  FPTFDepartureArrival,
  DeparturesResponse, // We need these for fetching sample departures
} from "../Routes/dbApiTypes";
import {
  FavoriteStationConfig,
  TransportationConfig,
  StationDepartureFilters,
} from "./TransportationConfigEditor"; // Self-import for updated types

export interface FavoriteStationConfig {
  id: string; // DB Station ID (eva number)
  name: string;
}

export interface TransportationConfig {
  name: string;
  stations: FavoriteStationConfig[];
  maxDepartures: number;
  departureWindowMinutes: number; // duration in minutes for the departures board
  refreshIntervalSeconds: number;
}

export interface DepartureFilter {
  lineId?: string; // e.g., "bus-27" (from FPTFLine.id)
  lineName?: string; // e.g., "Bus 27" (for display)
  direction?: string; // e.g., "Billstedt (U), Hamburg" (from FPTFDepartureArrival.direction)
  // We can use a composite key or individual properties for matching
  // For simplicity, let's use a composite key: `${lineId}-${direction}` or just lineId if direction is not specific.
  // Or we can store them as objects and match properties.
  // Let's go with storing lineName and direction for the filter criteria.
}

export interface StationDepartureFilters {
  stationId: string;
  // Key: A unique string representing the line, e.g., `${line.name}-${direction}` or just `line.name`
  // Value: boolean (true if shown, false if hidden)
  // This allows easy lookup and toggling.
  // Alternatively, an array of { lineName: string, direction?: string, enabled: boolean }
  // Let's use an array of objects for more structured storage and easier UI generation.
  filters: Array<{
    lineName: string; // e.g., "Bus 27"
    direction?: string; // Optional: if filtering by specific direction too
    show: boolean; // True to show, false to hide
  }>;
}

// Update TransportationConfig
export interface TransportationConfig {
  name: string;
  stations: FavoriteStationConfig[];
  maxDepartures: number;
  departureWindowMinutes: number;
  refreshIntervalSeconds: number;
  // NEW:
  stationFilters: StationDepartureFilters[];
}

type ConfigTab = "general" | "filters";
const getUniqueLinesAndDirections = (
  departures: FPTFDepartureArrival[],
): Array<{ lineName: string; direction?: string }> => {
  const unique = new Map<string, { lineName: string; direction?: string }>();
  departures.forEach((dep) => {
    if (dep.line?.name) {
      const key = `${dep.line.name}-${dep.direction || "any"}`; // Use 'any' if direction isn't critical or varies too much
      if (!unique.has(key)) {
        unique.set(key, { lineName: dep.line.name, direction: dep.direction });
      }
    }
  });
  return Array.from(unique.values());
};

export const DeparturesConfigEditor: React.FC<
  WidgetConfigComponentProps<TransportationConfig>
> = ({ config, onConfigChange }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>("general");

  // States for General Tab (existing)
  const [stationSearchTerm, setStationSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FPTFLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // States for Filters Tab
  const [selectedStationForFiltering, setSelectedStationForFiltering] =
    useState<string | null>(null);
  const [availableLinesForStation, setAvailableLinesForStation] = useState<
    Array<{ lineName: string; direction?: string }>
  >([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);

  const favoriteStationItemStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 5px", // Added some padding
    borderBottom: "1px dashed #eee",
    fontSize: "0.95em",
  };

  const removeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid #ff4d4f", // Red border
    color: "#ff4d4f", // Red text
    padding: "3px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85em",
    marginLeft: "10px", // Add some space
    transition: "background-color 0.2s, color 0.2s",
  };

  const removeButtonHoverStyle: React.CSSProperties = {
    backgroundColor: "#ff4d4f",
    color: "white",
  };

  // --- General Tab Logic (mostly existing) ---
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;
    if (type === "number") processedValue = parseInt(value, 10) || 0;
    onConfigChange({ ...config, [name]: processedValue });
  };

  const handleStationSearch = useCallback(async () => {
    /* ... existing logic ... */
    if (!stationSearchTerm.trim()) {
      /* ... */
    }
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const response = await fetch(
        `${API_BASE_URL}/locations?query=${encodeURIComponent(stationSearchTerm)}&results=10&fuzzy=true`,
      );
      if (!response.ok) {
        /* ... error handling ... */ throw new Error("Search Failed");
      }
      const data: LocationsResponse = await response.json();
      setSearchResults(
        data.filter((loc) => loc.type === "station" || loc.type === "stop") ||
          [],
      );
    } catch (error) {
      /* ... error handling ... */
    } finally {
      setSearchLoading(false);
    }
  }, [stationSearchTerm]);

  const handleSelectAllFilters = (show: boolean) => {
    if (!selectedStationForFiltering || availableLinesForStation.length === 0)
      return;

    const newFiltersForStation = availableLinesForStation.map((lineDir) => ({
      lineName: lineDir.lineName,
      direction: lineDir.direction,
      show: show,
    }));

    const updatedStationFilters = (config.stationFilters || []).map((sf) =>
      sf.stationId === selectedStationForFiltering
        ? { ...sf, filters: newFiltersForStation }
        : sf,
    );
    // If no filter entry existed for this station, create it
    if (
      !(config.stationFilters || []).find(
        (sf) => sf.stationId === selectedStationForFiltering,
      )
    ) {
      updatedStationFilters.push({
        stationId: selectedStationForFiltering,
        filters: newFiltersForStation,
      });
    }

    onConfigChange({ ...config, stationFilters: updatedStationFilters });
  };

  const addFavoriteStation = (station: FPTFLocation) => {
    if (
      station.id &&
      station.name &&
      !config.stations.find((fs) => fs.id === station.id)
    ) {
      const newStations = [
        ...config.stations,
        { id: station.id, name: station.name },
      ];
      // Also add a default filter entry for this new station
      const newStationFilters = [
        ...(config.stationFilters || []),
        { stationId: station.id, filters: [] }, // Initially, no specific filters, meaning show all
      ];
      onConfigChange({
        ...config,
        stations: newStations,
        stationFilters: newStationFilters,
      });
    }
  };

  const removeFavoriteStation = (stationId: string) => {
    const newStations = config.stations.filter((s) => s.id !== stationId);
    const newStationFilters = (config.stationFilters || []).filter(
      (sf) => sf.stationId !== stationId,
    );
    onConfigChange({
      ...config,
      stations: newStations,
      stationFilters: newStationFilters,
    });
    if (selectedStationForFiltering === stationId) {
      setSelectedStationForFiltering(null); // Deselect if removed
      setAvailableLinesForStation([]);
    }
  };

  // --- Filters Tab Logic ---
  useEffect(() => {
    // If a station is selected for filtering, fetch its available lines/directions
    if (selectedStationForFiltering) {
      setLinesLoading(true);
      setLinesError(null);
      setAvailableLinesForStation([]);

      const fetchLines = async () => {
        try {
          // Fetch a small sample of departures to discover lines/directions
          // We use a large enough window to likely get variety.
          const params = new URLSearchParams({
            duration: "180",
            results: "50",
          });
          const response = await fetch(
            `${API_BASE_URL}/stops/${encodeURIComponent(selectedStationForFiltering)}/departures?${params.toString()}`,
          );
          if (!response.ok) {
            const errData = await response
              .json()
              .catch(() => ({ message: response.statusText }));
            throw new Error(
              `API error: ${response.status} - ${errData.details || errData.message || "Failed to fetch lines"}`,
            );
          }
          const data: DeparturesResponse = await response.json();
          setAvailableLinesForStation(
            getUniqueLinesAndDirections(data.departures || []),
          );
        } catch (error) {
          console.error("Failed to fetch lines for station:", error);
          setLinesError(error instanceof Error ? error.message : String(error));
        } finally {
          setLinesLoading(false);
        }
      };
      fetchLines();
    } else {
      setAvailableLinesForStation([]); // Clear if no station selected
    }
  }, [selectedStationForFiltering]);

  const currentStationFilters = useMemo(() => {
    if (!selectedStationForFiltering) return undefined;
    return (config.stationFilters || []).find(
      (sf) => sf.stationId === selectedStationForFiltering,
    );
  }, [config.stationFilters, selectedStationForFiltering]);

  const handleFilterToggle = (
    lineName: string,
    direction: string | undefined,
    show: boolean,
  ) => {
    if (!selectedStationForFiltering) return;

    let stationFiltersEntry = (config.stationFilters || []).find(
      (sf) => sf.stationId === selectedStationForFiltering,
    );
    let newFiltersForStation: StationDepartureFilters["filters"];

    if (!stationFiltersEntry) {
      // Should not happen if addFavoriteStation initializes it
      stationFiltersEntry = {
        stationId: selectedStationForFiltering,
        filters: [],
      };
    }

    const existingFilterIndex = stationFiltersEntry.filters.findIndex(
      (f) => f.lineName === lineName && f.direction === direction,
    );

    if (existingFilterIndex > -1) {
      newFiltersForStation = stationFiltersEntry.filters.map((f, index) =>
        index === existingFilterIndex ? { ...f, show } : f,
      );
    } else {
      newFiltersForStation = [
        ...stationFiltersEntry.filters,
        { lineName, direction, show },
      ];
    }

    const updatedStationFilters = (config.stationFilters || []).map((sf) =>
      sf.stationId === selectedStationForFiltering
        ? { ...sf, filters: newFiltersForStation }
        : sf,
    );
    // If it was a new station entry for filters
    if (
      !(config.stationFilters || []).find(
        (sf) => sf.stationId === selectedStationForFiltering,
      )
    ) {
      updatedStationFilters.push({
        stationId: selectedStationForFiltering,
        filters: newFiltersForStation,
      });
    }

    onConfigChange({ ...config, stationFilters: updatedStationFilters });
  };

  const isLineShown = (lineName: string, direction?: string): boolean => {
    if (!currentStationFilters || !currentStationFilters.filters.length) {
      return true; // Default to show if no filters are defined for this line/direction yet
    }
    const specificFilter = currentStationFilters.filters.find(
      (f) => f.lineName === lineName && f.direction === direction,
    );
    if (specificFilter) {
      return specificFilter.show;
    }
    // Fallback: if there's a filter for the line without specific direction, use that.
    // This part can be made more sophisticated if needed. For now, explicit match or default show.
    return true; // Default to show if no specific filter matches
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
  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "10px 15px",
    border: "none",
    borderBottom: isActive ? "3px solid #007bff" : "3px solid transparent",
    cursor: "pointer",
    background: isActive ? "#f0f0f0" : "transparent",
    fontWeight: isActive ? "bold" : "normal",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      {/* Tab Navigation */}
      <div style={{ borderBottom: "1px solid #ccc", marginBottom: "15px" }}>
        <button
          style={tabButtonStyle(activeTab === "general")}
          onClick={() => setActiveTab("general")}
        >
          General & Stations
        </button>
        <button
          style={tabButtonStyle(activeTab === "filters")}
          onClick={() => setActiveTab("filters")}
          disabled={config.stations.length === 0}
        >
          Departure Filters{" "}
          {config.stations.length === 0 ? "(Add Stations First)" : ""}
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <>
          <div>
            <label htmlFor="widgetName" style={labelStyle}>
              Widget Name:
            </label>
            <input
              type="text"
              id="widgetName"
              name="name"
              value={config.name}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          {/* Station Search and Management (existing) */}
          <div
            style={{
              border: "1px solid #eee",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            {/* ... Station search input and results (same as before) ... */}
            <label htmlFor="stationSearch" style={labelStyle}>
              Search and Add Stations:
            </label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                id="stationSearch"
                /* ... */ value={stationSearchTerm}
                onChange={(e) => setStationSearchTerm(e.target.value)}
              />
              <button onClick={handleStationSearch} disabled={searchLoading}>
                {searchLoading ? "..." : "Search"}
              </button>
            </div>
            {searchError && <p style={{ color: "red" }}>{searchError}</p>}
            {searchResults.length > 0 && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 10px 0",
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                }}
              >
                {searchResults.map(
                  (station) =>
                    station.id &&
                    station.name && ( // Ensure basic properties exist
                      <li
                        key={station.id}
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          {station.name} ({station.id})
                        </span>
                        <button
                          onClick={() => addFavoriteStation(station)}
                          style={{ padding: "4px 8px", fontSize: "0.9em" }}
                        >
                          Add
                        </button>
                      </li>
                    ),
                )}
              </ul>
            )}

            <h4 style={{ marginTop: "15px", marginBottom: "5px" }}>
              Favorite Stations:
            </h4>
            {config.stations.length === 0 ? (
              <p>No stations added yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                {" "}
                {/* Removed trailing comma */}
                {config.stations.map((station) => (
                  <li key={station.id} style={favoriteStationItemStyle}>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {station.name} ({station.id})
                    </span>
                    <button
                      onClick={() => removeFavoriteStation(station.id)}
                      style={removeButtonStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          removeButtonHoverStyle.backgroundColor;
                        e.currentTarget.style.color =
                          removeButtonHoverStyle.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          removeButtonStyle.background as string;
                        e.currentTarget.style.color =
                          removeButtonStyle.color as string;
                      }}
                      title={`Remove ${station.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="maxDepartures" style={labelStyle}>
              Departures to Show per Station:
            </label>
            <input
              type="number"
              id="maxDepartures"
              name="maxDepartures"
              value={config.maxDepartures}
              onChange={handleChange}
              min="1"
              max="25"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="departureWindowMinutes" style={labelStyle}>
              Departure Window (minutes):
            </label>
            <input
              type="number"
              id="departureWindowMinutes"
              name="departureWindowMinutes"
              value={config.departureWindowMinutes}
              onChange={handleChange}
              min="10"
              max={720}
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
              min="30"
              style={inputStyle}
            />
          </div>
        </>
      )}

      {/* Filters Tab Content */}
      {activeTab === "filters" && config.stations.length > 0 && (
        <>
          <div>
            <label htmlFor="filterStationSelect" style={labelStyle}>
              Select Station to Configure Filters:
            </label>
            <select
              id="filterStationSelect"
              value={selectedStationForFiltering || ""}
              onChange={(e) =>
                setSelectedStationForFiltering(e.target.value || null)
              }
              style={inputStyle}
            >
              <option value="">-- Select a Station --</option>
              {config.stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedStationForFiltering && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h4 style={{ margin: "0" }}>
                  Available Lines/Directions for{" "}
                  {
                    config.stations.find(
                      (s) => s.id === selectedStationForFiltering,
                    )?.name
                  }
                  :
                </h4>
                {availableLinesForStation.length > 0 && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => handleSelectAllFilters(true)}
                      style={{ padding: "4px 8px", fontSize: "0.9em" }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => handleSelectAllFilters(false)}
                      style={{ padding: "4px 8px", fontSize: "0.9em" }}
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>
              {linesLoading && <p>Loading available lines...</p>}
              {linesError && (
                <p style={{ color: "red" }}>
                  Error loading lines: {linesError}
                </p>
              )}
              {!linesLoading &&
                !linesError &&
                availableLinesForStation.length === 0 && (
                  <p>No lines found or unable to fetch.</p>
                )}
              {!linesLoading &&
                !linesError &&
                availableLinesForStation.length > 0 && (
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      maxHeight: "250px",
                      overflowY: "auto",
                      border: "1px solid #ddd",
                    }}
                  >
                    {availableLinesForStation.map(
                      ({ lineName, direction }, index) => {
                        const isChecked = isLineShown(lineName, direction);
                        return (
                          <li
                            key={`${lineName}-${direction || "any"}-${index}`}
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #eee",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              id={`filter-${lineName}-${direction || "any"}-${index}`}
                              checked={isChecked}
                              onChange={(e) =>
                                handleFilterToggle(
                                  lineName,
                                  direction,
                                  e.target.checked,
                                )
                              }
                              style={{ marginRight: "10px" }}
                            />
                            <label
                              htmlFor={`filter-${lineName}-${direction || "any"}-${index}`}
                              style={{ flexGrow: 1, cursor: "pointer" }}
                            >
                              {lineName}{" "}
                              {direction
                                ? `(Direction: ${direction})`
                                : "(Any Direction)"}
                            </label>
                          </li>
                        );
                      },
                    )}
                  </ul>
                )}
            </div>
          )}
          {!selectedStationForFiltering && (
            <p>Select a station above to see its filter options.</p>
          )}
        </>
      )}
    </div>
  );
};
