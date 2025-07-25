import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import { ActivityTrackerConfig, MetadataFieldDef } from "./types";
import { entitiesApi } from "../../../api/entitiesApi";
import { Entity } from "../../../types/entities";

import {
  calidadEmojis,
  calidadTooltips,
} from "../SleepTrackerWidget/sleepUtils";

// --- Dynamic Input Renderer for the Modal ---
const MetadataInput: React.FC<{
  field: MetadataFieldDef;
  value: any;
  onChange: (value: any) => void;
}> = ({ field, value, onChange }) => {
  switch (field.type) {
    case "number":
      return (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      );
    case "rating":
      return (
        <div style={{ display: "flex" }}>
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              title={calidadTooltips[q]}
              onClick={() => onChange(q)}
              style={{
                padding: "8px 12px",
                margin: "0 4px",
                border: "1px solid #ccc",
                cursor: "pointer",
                fontSize: "1.2em",
                background:
                  value === q ? "var(--accent-color, #007bff)" : "#f0f0f0",
                color: value === q ? "white" : "black",
              }}
            >
              {calidadEmojis[q]}
            </button>
          ))}
        </div>
      );
    case "text":
    default:
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      );
  }
};

// --- The Modal for Ending an Occurrence ---
const EndOccurrenceModal: React.FC<{
  activityName: string;
  metadataFields: MetadataFieldDef[];
  onConfirm: (notes: string, metadata: Record<string, any>) => void;
  onCancel: () => void;
}> = ({ activityName, metadataFields, onConfirm, onCancel }) => {
  const [notes, setNotes] = useState("");
  const [metadataValues, setMetadataValues] = useState<Record<string, any>>({});

  const qualityMap: { [key: number]: string } = {
    1: "bad",
    2: "poor",
    3: "okay",
    4: "good",
    5: "great",
  };

  const handleMetadataChange = (fieldName: string, value: any) => {
    setMetadataValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleConfirm = () => {
    const finalMetadata: Record<string, any> = {};
    // Process values before sending (e.g., convert rating number to string key)
    for (const field of metadataFields) {
      let value = metadataValues[field.name];
      if (field.type === "rating" && typeof value === "number") {
        finalMetadata[field.name] = qualityMap[value] || "okay";
      } else if (value !== undefined) {
        finalMetadata[field.name] = value;
      }
    }
    onConfirm(notes, finalMetadata);
  };

  const modalOverlayStyle: React.CSSProperties = {
    /* same as before */ position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };
  const modalContentStyle: React.CSSProperties = {
    /* same as before */ background: "white",
    padding: "20px",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "500px",
  };

  return (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h3>Log Completion for "{activityName}"</h3>

        <div style={{ marginBottom: "15px" }}>
          <label>Notes (optional):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: "100%", minHeight: "80px", marginTop: "5px" }}
          />
        </div>

        {metadataFields.length > 0 && (
          <h4
            style={{
              marginTop: "20px",
              borderTop: "1px solid #eee",
              paddingTop: "15px",
            }}
          >
            Metadata
          </h4>
        )}
        {metadataFields.map((field) => (
          <div key={field.name} style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              {field.label}:
            </label>
            <MetadataInput
              field={field}
              value={metadataValues[field.name]}
              onChange={(value) => handleMetadataChange(field.name, value)}
            />
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: "20px",
          }}
        >
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={handleConfirm}
            style={{ background: "#4CAF50", color: "white" }}
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
};

const LogHistory: React.FC<{
  occurrences: any[];
  metadataFields: MetadataFieldDef[];
}> = ({ occurrences, metadataFields }) => {
  const tableHeaderStyle: React.CSSProperties = {
    background: "#f4f4f4",
    padding: "8px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontSize: "0.9em",
    whiteSpace: "nowrap", // Prevent headers from wrapping
  };
  const tableCellStyle: React.CSSProperties = {
    padding: "8px",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
    fontSize: "0.85em",
  };

  if (occurrences.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#888", padding: "10px 0" }}>
        No history logged yet.
      </p>
    );
  }

  const calculateDuration = (start: string, end: string): string => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  };

  // Create a reverse map for quality display if needed
  const qualityReverseMap: { [key: string]: number } = {
    bad: 1,
    poor: 2,
    okay: 3,
    good: 4,
    great: 5,
  };

  return (
    <div
      style={{
        maxHeight: "300px",
        overflowY: "auto",
        border: "1px solid #ddd",
        marginTop: "10px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>Activity</th>
            <th style={tableHeaderStyle}>Date</th>
            <th style={tableHeaderStyle}>Start</th>
            <th style={tableHeaderStyle}>End</th>
            <th style={tableHeaderStyle}>Duration</th>
            <th style={tableHeaderStyle}>Notes</th>
            {metadataFields.map((f) => (
              <th key={f.name} style={tableHeaderStyle}>
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {occurrences.map((log, index) => (
            <tr key={index}>
              <td style={tableCellStyle}>{log.parentEntityName}</td>
              <td style={tableCellStyle}>{formatDate(log.start_time)}</td>
              <td style={tableCellStyle}>{formatTime(log.start_time)}</td>
              <td style={tableCellStyle}>{formatTime(log.end_time)}</td>
              <td style={tableCellStyle}>
                {calculateDuration(log.start_time, log.end_time)}
              </td>
              <td style={{ ...tableCellStyle, whiteSpace: "pre-wrap" }}>
                {log.notes || "-"}
              </td>
              {metadataFields.map((field) => {
                const value = log.metadata?.[field.name];
                let displayValue: React.ReactNode = value ?? "-";
                if (field.type === "rating" && typeof value === "string") {
                  const qualityNumber = qualityReverseMap[value];
                  if (qualityNumber)
                    displayValue = (
                      <span title={value}>{calidadEmojis[qualityNumber]}</span>
                    );
                }
                return (
                  <td key={field.name} style={tableCellStyle}>
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ActivityRow: React.FC<{
  entity: Entity;
  onToggle: (entity: Entity) => void;
  isLoading: boolean;
}> = ({ entity, onToggle, isLoading }) => {
  const isOccurrenceActive =
    !!entity.attributes.active_occurrence_start_time?.value;
  const activeStartTime = entity.attributes.active_occurrence_start_time?.value;

  // *** FIXED: Restored distinct button styling ***
  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "0.9em",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    background: isOccurrenceActive ? "#FFC107" : "#0288D1", // Yellow for Stop, Blue for Start
    minWidth: "80px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #eee",
      }}
    >
      <div style={{ flex: 1, paddingRight: "10px" }}>
        <span style={{ fontWeight: 500 }}>{entity.name}</span>
        {isOccurrenceActive && activeStartTime && (
          <p style={{ fontSize: "0.8em", margin: "2px 0 0 0", color: "#555" }}>
            Started: {new Date(activeStartTime).toLocaleTimeString()}
          </p>
        )}
      </div>
      <button
        onClick={() => onToggle(entity)}
        disabled={isLoading}
        style={buttonStyle}
      >
        {isLoading ? "..." : isOccurrenceActive ? "Stop" : "Start"}
      </button>
    </div>
  );
};

export const ActivityTrackerWidget: React.FC<
  WidgetProps<ActivityTrackerConfig>
> = ({ id, config, onRemove, onWidgetConfigure }) => {
  // NEW: State holds a map of entities, keyed by their ID for easy access
  const [entities, setEntities] = useState<Record<string, Entity>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the 'end' modal
  const [endingEntity, setEndingEntity] = useState<Entity | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { trackedActivities, metadataFields } = config;

  // NEW: A robust, centralized data fetching function
  const fetchAllTrackedData = useCallback(async () => {
    if (!trackedActivities || trackedActivities.length === 0) {
      setEntities({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all active entities first. This is the most efficient way to get status.
      const activeEntities = await entitiesApi.getActiveEntities();
      const activeEntityMap: Record<string, Entity> = {};
      for (const entity of activeEntities) {
        const entityId = `${entity.entity_type}:${entity.category}:${entity.name}`;
        activeEntityMap[entityId] = entity;
      }

      // Now, build the full list of entities we need to display
      const promises = trackedActivities.map((activity) => {
        // If the entity is already in our active map, use it.
        if (activeEntityMap[activity.id]) {
          return Promise.resolve(activeEntityMap[activity.id]);
        }
        // Otherwise, fetch its latest (inactive) state.
        return entitiesApi.getEntity(
          activity.entityType,
          activity.entityCategory,
          activity.entityName,
        );
      });

      const results = await Promise.all(promises);

      const newEntityMap: Record<string, Entity> = {};
      results.forEach((entity) => {
        if (entity) {
          const entityId = `${entity.entity_type}:${entity.category}:${entity.name}`;
          newEntityMap[entityId] = entity;
        }
      });
      setEntities(newEntityMap);
    } catch (err: any) {
      setError(`Failed to refresh activities: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [trackedActivities]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAllTrackedData();
    const interval = setInterval(fetchAllTrackedData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAllTrackedData]);

  // --- Handlers ---
  const handleToggle = (entity: Entity) => {
    const isOccurrenceActive =
      !!entity.attributes.active_occurrence_start_time?.value;
    if (isOccurrenceActive) {
      setEndingEntity(entity);
    } else {
      handleStart(entity);
    }
  };

  const handleStart = async (entity: Entity) => {
    setIsLoading(true);
    try {
      await entitiesApi.startOccurrence(
        entity.entity_type,
        entity.category,
        entity.name,
      );
      // After starting, refresh ALL activities to catch any side-effects
      await fetchAllTrackedData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEnd = async (
    notes: string,
    metadata: Record<string, any>,
  ) => {
    if (!endingEntity) return;

    setIsLoading(true);
    const payload = {
      notes: notes || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
    try {
      await entitiesApi.endOccurrence(
        endingEntity.entity_type,
        endingEntity.category,
        endingEntity.name,
        payload,
      );
      // After ending, refresh ALL activities
      await fetchAllTrackedData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setEndingEntity(null);
    }
  };

  const entityList = useMemo(() => Object.values(entities), [entities]);

  const unifiedSortedOccurrences = useMemo(() => {
    const allOccs: any[] = [];

    // Collate occurrences from all tracked entities
    entityList.forEach((entity) => {
      const occs = entity.attributes.occurrences?.value;
      if (Array.isArray(occs)) {
        // Add the parent entity's name to each occurrence for context
        occs.forEach((occ) => {
          allOccs.push({ ...occ, parentEntityName: entity.name });
        });
      }
    });

    // Sort the unified list chronologically by end time, most recent first
    return allOccs.sort(
      (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
    );
  }, [entityList]);

  // useMemo to get a sorted list for rendering
  const sortedTrackedActivities = useMemo(
    () =>
      [...(trackedActivities || [])].sort((a, b) => a.id.localeCompare(b.id)),
    [trackedActivities],
  );

  const renderContent = () => {
    if (!trackedActivities || trackedActivities.length === 0) {
      return (
        <div style={{ padding: "20px", textAlign: "center", color: "#777" }}>
          <p>No activities configured to track.</p>
          <button onClick={onWidgetConfigure}>Configure Now</button>
        </div>
      );
    }

    if (isLoading && Object.keys(entities).length === 0)
      return <p>Loading activities...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
      <div style={{ padding: "0 15px 15px 15px" }}>
        {entityList
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((entity) => (
            <ActivityRow
              key={entity.attributes.id?.value} // Assuming you have a unique ID attribute
              entity={entity}
              onToggle={handleToggle}
              isLoading={isLoading}
            />
          ))}

        {unifiedSortedOccurrences.length > 0 && (
          <div
            style={{
              marginTop: "20px",
              borderTop: "2px solid #ccc",
              paddingTop: "10px",
            }}
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                cursor: "pointer",
                fontSize: "1em",
                padding: "5px 0",
              }}
            >
              {showHistory
                ? "▼ Hide Combined History"
                : "► Show Combined History"}{" "}
              ({unifiedSortedOccurrences.length})
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      {renderContent()}
      {showHistory && (
        <div style={{ padding: "0 15px 15px 15px" }}>
          <LogHistory
            occurrences={unifiedSortedOccurrences}
            metadataFields={metadataFields || []}
          />
        </div>
      )}
      {endingEntity && (
        <EndOccurrenceModal
          activityName={endingEntity.name}
          metadataFields={metadataFields || []}
          onConfirm={handleConfirmEnd}
          onCancel={() => setEndingEntity(null)}
        />
      )}
    </BaseWidget>
  );
};
