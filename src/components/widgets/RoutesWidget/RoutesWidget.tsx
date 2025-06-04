// src/widgets/Routes/RoutesWidget.tsx
import React, { useState, useCallback, useEffect } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";
import { calculateTimeFromNow } from "../../../utils/timeUtils";

import {
  RoutesWidgetConfig,
  FavoriteStationRouteConfig,
  FPTFJourney,
  JourneysResponse,
  FPTFLeg,
  API_BASE_URL,
} from "../Routes/dbApiTypes";

interface RouteQueryState {
  fromId: string | null;
  toId: string | null;
}

const formatLegTime = (isoTime: string | null): string => {
  if (!isoTime) return "--:--";
  try {
    const date = new Date(isoTime);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "Err";
  }
};

interface JourneyDisplayProps {
  journey: FPTFJourney;
  index: number;
  initiallyExpanded?: boolean;
}

const JourneyDisplay: React.FC<JourneyDisplayProps> = ({
  journey,
  index,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  if (!journey.legs || journey.legs.length === 0) {
    return <p>No legs in this journey.</p>;
  }

  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const totalDurationMinutes =
    (new Date(lastLeg.arrival!).getTime() -
      new Date(firstLeg.departure!).getTime()) /
    (1000 * 60);
  const transfers = journey.legs.filter((leg) => leg.line).length - 1; // Count transitions between vehicle legs

  const summaryStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    backgroundColor: isExpanded ? "#e9ecef" : "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: isExpanded ? "4px 4px 0 0" : "4px",
    cursor: "pointer",
    marginBottom: isExpanded ? 0 : "10px",
  };

  const timeFromNowStyle: React.CSSProperties = {
    fontSize: "0.8em", // Smaller font for relative time
    color: "#555",
    fontWeight: "normal",
    marginLeft: "4px",
  };

  const getLineTypes = (legs: FPTFLeg[]): string => {
    const types = new Set<string>();
    legs.forEach((leg) => {
      if (leg.line?.name)
        types.add(leg.line.name.split(" ")[0]); // Get first part like "ICE", "S", "Bus"
      else if (leg.walking) types.add("🚶");
    });
    return Array.from(types).slice(0, 3).join(", "); // Show a few prominent types
  };

  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={summaryStyle} onClick={() => setIsExpanded(!isExpanded)}>
        <div>
          <strong style={{ fontSize: "1.05em" }}>
            {formatLegTime(firstLeg.departure)}
            <span style={timeFromNowStyle}>
              {calculateTimeFromNow(firstLeg.departure)}
            </span>
            {" → "}
            {formatLegTime(lastLeg.arrival)}
            <span style={timeFromNowStyle}>
              {calculateTimeFromNow(lastLeg.arrival)}
            </span>
          </strong>
          <span
            style={{ marginLeft: "8px", fontSize: "0.9em", color: "#495057" }}
          >
            ({Math.round(totalDurationMinutes)} min,{" "}
            {transfers < 0 ? 0 : transfers} transfer{transfers !== 1 ? "s" : ""}
            )
          </span>
        </div>
        <span style={{ fontSize: "0.85em", color: "#6c757d" }}>
          {getLineTypes(journey.legs)}
        </span>
        <span style={{ fontSize: "1.2em" }}>{isExpanded ? "▲" : "▼"}</span>
      </div>
      {isExpanded && (
        <div
          style={{
            border: "1px solid #dee2e6",
            borderTop: "none",
            padding: "10px",
            borderRadius: "0 0 4px 4px",
          }}
        >
          {journey.legs.map((leg, legIndex) => (
            <LegDisplay
              key={`${leg.tripId || "walk"}-${legIndex}`}
              leg={leg}
              calculateTimeFromNow={calculateTimeFromNow}
              timeFromNowStyle={timeFromNowStyle}
            />
          ))}
          {journey.remarks && journey.remarks.length > 0 && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.85em",
                color: "#555",
                borderTop: "1px dashed #ccc",
                paddingTop: "8px",
              }}
            >
              <strong>Remarks:</strong>
              {journey.remarks.map((r, i) => (
                <p key={`remark-${i}`} style={{ margin: "2px 0" }}>
                  {r.summary || r.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LegDisplayProps {
  leg: FPTFLeg;
  calculateTimeFromNow: (isoTime: string | null) => string; // Added prop
  timeFromNowStyle: React.CSSProperties; // Added prop
}

const LegDisplay: React.FC<LegDisplayProps> = ({
  leg,
  calculateTimeFromNow,
  timeFromNowStyle,
}) => {
  const legStyle: React.CSSProperties = {
    padding: "8px",
    borderLeft: `4px solid ${leg.line?.product === "suburban" ? "green" : leg.line?.mode === "bus" ? "grey" : leg.walking ? "orange" : "#007bff"}`,
    marginBottom: "8px",
    backgroundColor: "#f9f9f9",
    fontSize: "0.9em",
  };
  const timeStyle: React.CSSProperties = {
    fontWeight: "bold",
    minWidth: "45px",
    display: "inline-block",
  };

  return (
    <div style={legStyle}>
      <div>
        <span style={timeStyle}>{formatLegTime(leg.departure)}</span>
        <span style={timeFromNowStyle}>
          {calculateTimeFromNow(leg.departure)}
        </span>
        <strong style={{ margin: "0 5px" }}>{leg.origin.name}</strong>
        {leg.departurePlatform && <small>(Pl. {leg.departurePlatform})</small>}
      </div>
      <div
        style={{
          margin: "5px 0 5px 20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {leg.line && (
          <span
            style={{
              fontWeight: "bold",
              marginRight: "8px",
              padding: "2px 5px",
              background: "#eee",
              borderRadius: "3px",
            }}
          >
            {leg.line.name}
          </span>
        )}
        <span>
          {leg.line
            ? `→ ${leg.direction || leg.destination.name}`
            : leg.walking
              ? `Walk (${leg.distance}m)`
              : `→ ${leg.destination.name}`}
        </span>
      </div>
      <div>
        <span style={timeStyle}>{formatLegTime(leg.arrival)}</span>
        <span style={timeFromNowStyle}>
          {calculateTimeFromNow(leg.arrival)}
        </span>
        <strong style={{ margin: "0 5px" }}>{leg.destination.name}</strong>
        {leg.arrivalPlatform && <small>(Pl. {leg.arrivalPlatform})</small>}
        {/* Delay info, ensuring it's not for walking legs if delay isn't applicable */}
        {leg.departureDelay !== null &&
          leg.departureDelay !== 0 &&
          !leg.walking && (
            <small
              style={{
                color: leg.departureDelay > 0 ? "orange" : "green",
                marginLeft: "5px",
              }}
            >
              {leg.departureDelay > 0
                ? `+${Math.round(leg.departureDelay / 60)}'`
                : `${Math.round(leg.departureDelay / 60)}'`}
            </small>
          )}
      </div>
      {leg.remarks && leg.remarks.length > 0 && (
        <div
          style={{
            fontSize: "0.8em",
            color: "#555",
            marginTop: "5px",
            borderTop: "1px dotted #ccc",
            paddingTop: "5px",
          }}
        >
          {leg.remarks.map((r, i) => (
            <p key={i} style={{ margin: "0 0 3px 0" }}>
              {r.summary || r.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export const RoutesWidget: React.FC<WidgetProps<RoutesWidgetConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  const [journeys, setJourneys] = useState<FPTFJourney[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const timerId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000); // Update "time from now" every 15 seconds
    return () => clearInterval(timerId);
  }, []);

  const fetchJourneys = useCallback(async () => {
    if (!config.fromStation?.id || !config.toStation?.id) {
      setJourneys([]); // Clear journeys if config is incomplete
      setError("From and To stations must be configured.");
      return;
    }
    setIsLoading(true);
    setError(null);
    // setJourneys([]); // Don't clear immediately, keep old data while loading new

    try {
      const params = new URLSearchParams({
        from: config.fromStation.id,
        to: config.toStation.id,
        results: String(config.resultsCount || 3),
        // Consider adding:
        // departure: new Date().toISOString(), // For current departures. API might default to this.
        // remarks: 'true', // To get journey remarks
      });
      const response = await fetch(
        `${API_BASE_URL}/journeys?${params.toString()}`,
      );
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          `API Error ${response.status}: ${errData.journeys?.[0]?.remarks?.[0]?.summary || errData.details || errData.message || "Failed"}`,
        );
      }
      const data: JourneysResponse = await response.json();
      setJourneys(data.journeys || []);
      setLastUpdated(new Date());
      if ((data.journeys || []).length === 0) {
        setError("No journeys found for this route.");
      }
    } catch (err) {
      console.error("Error fetching journeys:", err);
      setError(err instanceof Error ? err.message : String(err));
      setJourneys([]); // Clear journeys on error
    } finally {
      setIsLoading(false);
    }
  }, [config.fromStation, config.toStation, config.resultsCount]);

  useEffect(() => {
    if (config.fromStation?.id && config.toStation?.id) {
      fetchJourneys(); // Initial fetch
      const intervalId = setInterval(
        fetchJourneys,
        config.refreshIntervalSeconds * 1000,
      );
      return () => clearInterval(intervalId);
    } else {
      setJourneys([]); // Clear if config is incomplete
      setError("Please configure From and To stations.");
    }
  }, [config, fetchJourneys]); // fetchJourneys is memoized, config changes will trigger re-fetch

  const fromName = config.fromStation?.name || "N/A";
  const toName = config.toStation?.name || "N/A";

  return (
    <BaseWidget
      id={id}
      title={`${config.name}`}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          padding: "10px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontSize: "0.9em",
        }}
      >
        {isLoading && journeys.length === 0 && (
          <p style={{ textAlign: "center" }}>Loading routes...</p>
        )}
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          {!isLoading && journeys.length === 0 && !error && (
            <p style={{ textAlign: "center", color: "#777" }}>
              {config.fromStation && config.toStation
                ? "No routes found or still loading."
                : "Configure From/To stations."}
            </p>
          )}
          {journeys.map((journey, index) => (
            <JourneyDisplay
              key={journey.id || `journey-${index}`}
              journey={journey}
              index={index}
              initiallyExpanded={index === 0 && journeys.length === 1} // Expand first if only one
            />
          ))}
        </div>
        {lastUpdated && (
          <p
            style={{
              fontSize: "0.75em",
              color: "#aaa",
              textAlign: "center",
              marginTop: "auto",
              paddingTop: "5px",
              flexShrink: 0,
            }}
          >
            Last refreshed: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </BaseWidget>
  );
};
