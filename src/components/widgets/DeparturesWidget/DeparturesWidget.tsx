// src/widgets/Transportation/TransportationWidget.tsx
import React, { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget"; // Adjust path
import { WidgetProps } from "../../widgets/registry"; // Adjust path
import { calculateTimeFromNow } from "../../../utils/timeUtils";
import {
  FPTFDepartureArrival,
  DeparturesResponse,
  API_BASE_URL,
} from "../Routes/dbApiTypes"; // Adjust path
import {
  TransportationConfig,
  FavoriteStationConfig,
  StationDepartureFilters,
} from "./DeparturesWidgetConfigEditor"; // Ensure StationDepartureFilters is imported

interface StationDeparturesState {
  station: FavoriteStationConfig;
  departures: FPTFDepartureArrival[];
  loading: boolean;
  error?: string;
  lastFetched?: Date; // To show when this specific station was fetched
}

const formatTime = (isoTime: string | null): string => {
  if (!isoTime) return "--:--";
  try {
    const date = new Date(isoTime);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "Err";
  }
};

const getDelayColor = (delaySeconds: number | null): string => {
  if (delaySeconds === null || delaySeconds === 0) return "inherit";
  return delaySeconds > 0 ? "orange" : "green";
};

const applyStationFilters = (
  departures: FPTFDepartureArrival[],
  stationFilterConfig?: StationDepartureFilters,
): FPTFDepartureArrival[] => {
  if (
    !stationFilterConfig ||
    !stationFilterConfig.filters ||
    stationFilterConfig.filters.length === 0
  ) {
    return departures; // No filters defined for this station, show all
  }

  return departures.filter((dep) => {
    if (!dep.line?.name) return true; // If line name is missing, default to show (or could hide)

    // Check if there's a specific filter for this line and direction
    const specificFilter = stationFilterConfig.filters.find(
      (f) => f.lineName === dep.line!.name && f.direction === dep.direction,
    );
    if (specificFilter) return specificFilter.show;

    // Check if there's a filter for this line (any direction)
    const lineOnlyFilter = stationFilterConfig.filters.find(
      (f) => f.lineName === dep.line!.name && f.direction === undefined, // Filter for line, ignoring direction
    );
    if (lineOnlyFilter) return lineOnlyFilter.show;

    // Default behavior if no specific filter is found:
    // If there are *any* "show: false" filters for this station, and this departure isn't explicitly "show: true",
    // then it implies a "show only selected" mode.
    // However, our current filter logic in editor is more explicit: if a filter exists, it dictates.
    // If no filter for this specific line/direction exists, we assume it should be shown
    // unless a more general "hide all by default unless specified" logic is desired.
    // For now, if no filter matches, we show it. This means filters are opt-out.
    // To make it opt-in: return false here and only return true if a filter with show:true matches.

    // Let's refine: if ANY filter exists for this line (regardless of direction), and NONE of them say "show: true" for this specific dep, then hide.
    // This is complex. Let's stick to simple: if a filter for (lineName, direction) or (lineName) exists, use it. Otherwise, show.
    const hasAnyFilterForThisLine = stationFilterConfig.filters.some(
      (f) => f.lineName === dep.line!.name,
    );
    if (hasAnyFilterForThisLine) {
      // A filter for this line exists, but not for this specific direction.
      // If no filter says "show: true" for this line, and no directionless filter for this line says "show: true"
      // it means we should probably hide it if the user has started defining filters for this line.
      // This logic can get complex. The `isLineShown` in editor defaults to true.
      // For display, if a filter exists, it must say "show: true".
      // If NO filter exists for this line/direction combination at all, then default to show.
      const applicableFilters = stationFilterConfig.filters.filter(
        (f) => f.lineName === dep.line!.name,
      );
      if (applicableFilters.length > 0) {
        // Filters are defined for this line
        const explicitShowFilter = applicableFilters.find(
          (f) =>
            (f.direction === dep.direction || f.direction === undefined) &&
            f.show,
        );
        if (explicitShowFilter) return true; // An explicit "show" filter matches

        // If all filters for this line are "show: false", then hide.
        const allHide = applicableFilters.every((f) => !f.show);
        if (allHide) return false;

        // If some filters are show:true but not for this direction, and some are show:false...
        // This is where it gets tricky. Defaulting to show if no *exact* "show:false" match might be simplest.
        return true; // Default to show if no specific "show:false" filter for this exact line/direction
      }
    }
    return true; // Default to show if no filters are defined for this line at all
  });
};

const LineDisplay: React.FC<{ line?: FPTFLine; cancelled?: boolean }> = ({
  line,
  cancelled,
}) => {
  if (!line)
    return <span style={{ flexBasis: "60px", fontWeight: "bold" }}>N/A</span>;

  let style: React.CSSProperties = {
    flexBasis: "60px",
    fontWeight: "bold",
    padding: "2px 4px",
    borderRadius: "3px",
    color: "white",
    textAlign: "center",
    fontSize: "0.85em",
    marginRight: "5px",
  };

  // Basic product coloring
  switch (line.product) {
    case "nationalExpress": // ICE
    case "national": // IC/EC
      style.backgroundColor = "#E50000"; // DB Red
      break;
    case "regionalExpress":
    case "regional": // RE, RB
      style.backgroundColor = "#CC0000"; // Darker DB Red
      break;
    case "suburban": // S-Bahn
      style.backgroundColor = "#00A300"; // Green
      break;
    case "subway": // U-Bahn
      style.backgroundColor = "#006CB7"; // Blue
      break;
    case "tram":
      style.backgroundColor = "#FFD700"; // Yellow/Gold
      style.color = "#333";
      break;
    case "bus":
      style.backgroundColor = "#A0A0A0"; // Grey
      break;
    default:
      style.backgroundColor = "#777";
  }
  if (cancelled) style.textDecoration = "line-through";

  return <span style={style}>{line.name || line.id}</span>;
};

export const DeparturesWidget: React.FC<WidgetProps<TransportationConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  const [stationsState, setStationsState] = useState<StationDeparturesState[]>(
    [],
  );
  const [overallLastUpdated, setOverallLastUpdated] = useState<Date | null>(
    null,
  );

  const [, setTick] = useState(0);
  useEffect(() => {
    const timerId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000); // Update "time from now" every 15 seconds
    return () => clearInterval(timerId);
  }, []);

  const fetchDeparturesForOneStation = useCallback(
    async (
      station: FavoriteStationConfig,
      currentConfig: TransportationConfig,
    ): Promise<Partial<StationDeparturesState>> => {
      // Return only parts to update
      try {
        const params = new URLSearchParams({
          duration: String(currentConfig.departureWindowMinutes),
          results: String(currentConfig.maxDepartures), // 'results' is handled by hafas-rest-api if supported, or you slice later
        });
        const response = await fetch(
          `${API_BASE_URL}/stops/${encodeURIComponent(station.id)}/departures?${params.toString()}`,
        );

        if (!response.ok) {
          const errData = await response
            .json()
            .catch(() => ({ message: response.statusText }));
          throw new Error(
            `API error ${response.status}: ${errData.details || errData.message || "Failed to fetch"}`,
          );
        }

        // Assuming your API /stops/:id/departures directly returns an array of FPTFDepartureArrival
        // OR if it returns an object like { departures: FPTFDepartureArrival[], ... }
        // then you need to extract the array.
        //
        // From your provided log, the API response is { departures: [...], realtimeDataUpdatedAt: ... }
        // So your DeparturesResponse type is { departures: FPTFDepartureArrival[], ... }

        const responseData: DeparturesResponse = await response.json(); // This gets { departures: [...], ... }

        // THE FIX:
        return {
          departures: responseData.departures || [], // Extract the array here
          error: undefined,
          loading: false,
          lastFetched: new Date(),
        };
      } catch (error) {
        console.error(`Failed to fetch departures for ${station.name}:`, error);
        return {
          departures: [], // Ensure it's an array on error too
          error: error instanceof Error ? error.message : String(error),
          loading: false,
          lastFetched: new Date(),
        };
      }
    },
    [],
  );

  const fetchAllStationDepartures = useCallback(
    async (currentConfig: TransportationConfig) => {
      if (!currentConfig.stations || currentConfig.stations.length === 0) {
        setStationsState([]);
        setOverallLastUpdated(new Date()); // Update even if no stations
        return;
      }

      // Set initial loading state for all configured stations
      setStationsState(
        currentConfig.stations.map((cfgStation) => ({
          station: cfgStation,
          departures: [],
          loading: true,
          error: undefined,
          lastFetched: undefined, // Reset last fetched time for this station
        })),
      );

      // Create an array of promises
      const departurePromises = currentConfig.stations.map(
        (stationConfig) =>
          fetchDeparturesForOneStation(stationConfig, currentConfig).then(
            (result) => ({ stationConfig, result }),
          ), // Keep stationConfig with result
      );

      // Wait for all promises to settle
      const settledResults = await Promise.allSettled(departurePromises);

      // Build the new state based on settled promises
      const newStationsState: StationDeparturesState[] =
        currentConfig.stations.map((cfgStation) => {
          const settled = settledResults.find(
            (sr) =>
              sr.status === "fulfilled" &&
              sr.value.stationConfig.id === cfgStation.id,
          );
          if (settled && settled.status === "fulfilled") {
            const { result } = settled.value;
            return {
              station: cfgStation,
              departures: result.departures || [],
              loading: false,
              error: result.error,
              lastFetched: result.lastFetched || new Date(), // Use result's lastFetched
            };
          } else {
            // Handle rejected promises or cases where find didn't match (shouldn't happen if logic is correct)
            const rejected = settledResults.find(
              (sr) =>
                sr.status === "rejected" &&
                (sr.reason as any)?.stationConfig?.id === cfgStation.id,
            ); // A bit hacky to get stationConfig from reason
            return {
              station: cfgStation,
              departures: [],
              loading: false,
              error: rejected
                ? `Failed to fetch for ${cfgStation.name}`
                : "Unknown error during fetch.",
              lastFetched: new Date(),
            };
          }
        });

      setStationsState(newStationsState);
      setOverallLastUpdated(new Date());
    },
    [fetchDeparturesForOneStation],
  );

  useEffect(() => {
    fetchAllStationDepartures(config);
    const interval = setInterval(() => {
      fetchAllStationDepartures(config);
    }, config.refreshIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [config, fetchAllStationDepartures]); // Re-fetch if config (stations, interval etc.) changes

  console.log("TransportationWidget State:", {
    config,
    stationsState,
    overallLastUpdated,
  });

  return (
    <BaseWidget
      id={id}
      title={config.name || "Public Transport"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          padding: "5px",
          height: "100%",
          overflowY: "auto",
          fontSize: "0.85em",
        }}
      >
        {stationsState.map(
          ({ station, departures, loading, error, lastFetched }) => {
            const stationFilterConfig = (config.stationFilters || []).find(
              (sf) => sf.stationId === station.id,
            );
            const filteredDepartures = applyStationFilters(
              departures,
              stationFilterConfig,
            );
            return (
              <div
                key={station.id}
                style={{
                  marginBottom: "12px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "8px",
                }}
              >
                <h5
                  style={{
                    margin: "0 0 5px 5px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{station.name}</span>
                  {lastFetched && (
                    <small style={{ fontWeight: "normal", color: "#888" }}>
                      Updated: {formatTime(lastFetched.toISOString())}
                    </small>
                  )}
                </h5>
                {!loading &&
                  !error &&
                  filteredDepartures.length === 0 &&
                  departures.length > 0 && (
                    <p
                      style={{
                        paddingLeft: "5px",
                        fontStyle: "italic",
                        color: "#666",
                      }}
                    >
                      All departures for this station are currently filtered
                      out. Check widget configuration.
                    </p>
                  )}
                {!loading &&
                  !error &&
                  filteredDepartures.length === 0 &&
                  departures.length === 0 && (
                    <p style={{ paddingLeft: "5px" }}>No departures found.</p>
                  )}
                {!loading && !error && departures.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {filteredDepartures.map((dep, idx) => (
                      <li
                        key={`${dep.tripId}-${dep.line?.id || idx}-${dep.when}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "5px",
                          borderTop: idx > 0 ? "1px dotted #f0f0f0" : "none",
                          opacity: dep.cancelled ? 0.6 : 1,
                        }}
                      >
                        <LineDisplay
                          line={dep.line}
                          cancelled={dep.cancelled}
                        />
                        <span
                          style={{
                            flexGrow: 1,
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textDecoration: dep.cancelled
                              ? "line-through"
                              : "none",
                            fontSize: "0.95em",
                          }}
                        >
                          {dep.direction || "N/A"}
                        </span>
                        <span
                          style={{
                            flexBasis: "110px",
                            textAlign: "right",
                            fontWeight: "bold",
                            textDecoration: dep.cancelled
                              ? "line-through"
                              : "none",
                            fontSize: "0.95em",
                          }}
                        >
                          {" "}
                          {/* Increased flexBasis for more space */}
                          {formatTime(dep.when)}
                          {/* Time from now, only if not cancelled */}
                          {!dep.cancelled && (
                            <span
                              style={{
                                fontSize: "0.85em",
                                color: "#555",
                                fontWeight: "normal",
                                marginLeft: "3px",
                              }}
                            >
                              {calculateTimeFromNow(dep.when)}
                            </span>
                          )}
                          {/* Delay info */}
                          {dep.delay !== null &&
                            dep.delay !== 0 &&
                            !dep.cancelled && (
                              <span
                                style={{
                                  color: getDelayColor(dep.delay),
                                  marginLeft: "4px",
                                  fontSize: "0.9em",
                                }}
                              >
                                {dep.delay > 0
                                  ? `+${Math.round(dep.delay / 60)}`
                                  : `${Math.round(dep.delay / 60)}`}
                              </span>
                            )}
                        </span>
                        {dep.platform && (
                          <span
                            style={{
                              flexBasis: "45px",
                              textAlign: "right",
                              color: "#333",
                              fontSize: "0.9em",
                              marginLeft: "5px",
                            }}
                          >
                            Pl. {dep.platform}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          },
        )}
        {stationsState.length > 0 && overallLastUpdated && (
          <p
            style={{
              fontSize: "0.75em",
              color: "#aaa",
              textAlign: "center",
              marginTop: "10px",
            }}
          >
            Board last refreshed: {overallLastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </BaseWidget>
  );
};
