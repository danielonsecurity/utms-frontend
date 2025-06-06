import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BaseWidget } from "../BaseWidget"; // Assuming path to BaseWidget
import { WidgetProps } from "../../widgets/registry"; // Assuming path to registry
import {
  ModularTaskTrackerConfig,
  ModuleDefinition,
  ModuleRuntimeState,
  ModuleRuntimeStateMap,
  EnrichedModule,
} from "./types"; // Corrected import path

// --- Helper Functions ---

const getLocalStorageKey = (widgetId: string): string =>
  `modularTaskTrackerState_${widgetId}`;

const formatDate = (date: Date | null): string => {
  if (!date) return "N/A";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (date: Date | null): string => {
  if (!date) return "N/A";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateDueDate = (
  lastCompletedStr: string | null,
  frequencyDays: number,
): Date | null => {
  if (!lastCompletedStr) return null; // Or today if we want it due immediately on first setup? For now, null.
  const lastCompletedDate = new Date(lastCompletedStr);
  const dueDate = new Date(lastCompletedDate);
  dueDate.setDate(dueDate.getDate() + frequencyDays);
  return dueDate;
};

const calculateEffectiveDueDate = (
  baseDueDate: Date | null,
  snoozedUntilStr: string | null,
  lastCompletedStr: string | null,
  frequencyDays: number,
): Date | null => {
  let calculatedDueDate = baseDueDate;
  if (!lastCompletedStr && !snoozedUntilStr) {
    // Never completed, not snoozed: due "now" or based on a default policy
    // For simplicity, if never completed and not snoozed, let's consider it due "now" from a reference point.
    // Or, more simply, if lastCompleted is null, its dueDate is effectively in the past unless snoozed.
    // Let's refine this: if no lastCompletedDate, it's "pending first completion".
    // The `baseDueDate` will be null in this case from `calculateDueDate`.
    // If we want such tasks to appear "due", we could default their due date to "now".
    // For now, if `baseDueDate` is null, it means it has no concrete due date yet from completion.
  }

  const snoozedUntilDate = snoozedUntilStr ? new Date(snoozedUntilStr) : null;

  if (snoozedUntilDate) {
    // If snoozed, the effective due date is the snooze date,
    // unless the natural due date is even later (which is unlikely but possible).
    if (!calculatedDueDate || snoozedUntilDate > calculatedDueDate) {
      return snoozedUntilDate;
    }
  }
  return calculatedDueDate;
};

const calculateDaysUntilDue = (effectiveDueDate: Date | null): number => {
  if (!effectiveDueDate) return Infinity; // Or a very large number, not due yet or undefined
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Compare date parts only

  const dueDateCopy = new Date(effectiveDueDate);
  dueDateCopy.setHours(0, 0, 0, 0);

  const diffTime = dueDateCopy.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// --- ModularTaskTrackerDisplay Component ---

interface ModularTaskTrackerDisplayProps {
  widgetId: string;
  config: ModularTaskTrackerConfig;
}

const ModularTaskTrackerDisplay: React.FC<ModularTaskTrackerDisplayProps> = ({
  widgetId,
  config,
}) => {
  const [runtimeStates, setRuntimeStates] = useState<ModuleRuntimeStateMap>({});
  const [activeView, setActiveView] = useState<
    "list" | "by_location" | "session"
  >(config.defaultView);
  const [suggestedSession, setSuggestedSession] = useState<EnrichedModule[]>(
    [],
  );

  // Load and initialize runtime states from localStorage
  useEffect(() => {
    const storedStatesRaw = localStorage.getItem(getLocalStorageKey(widgetId));
    const loadedStates = storedStatesRaw ? JSON.parse(storedStatesRaw) : {};

    const newStates: ModuleRuntimeStateMap = {};
    config.modules.forEach((moduleDef) => {
      newStates[moduleDef.id] = loadedStates[moduleDef.id] || {
        lastCompletedDate: null,
        snoozedUntilDate: null,
      };
    });
    setRuntimeStates(newStates);
    // Initial view from config
    setActiveView(config.defaultView);
  }, [widgetId, config.modules, config.defaultView]); // Rerun if modules change in config

  // Save runtime states to localStorage
  useEffect(() => {
    if (Object.keys(runtimeStates).length > 0) {
      // Only save if states are initialized
      localStorage.setItem(
        getLocalStorageKey(widgetId),
        JSON.stringify(runtimeStates),
      );
    }
  }, [widgetId, runtimeStates]);

  const enrichedModules: EnrichedModule[] = useMemo(() => {
    return config.modules
      .map((moduleDef): EnrichedModule => {
        const state = runtimeStates[moduleDef.id] || {
          lastCompletedDate: null,
          snoozedUntilDate: null,
        };
        const baseDueDate = calculateDueDate(
          state.lastCompletedDate,
          moduleDef.frequencyDays,
        );
        const effectiveDueDate = calculateEffectiveDueDate(
          baseDueDate,
          state.snoozedUntilDate,
          state.lastCompletedDate,
          moduleDef.frequencyDays,
        );
        const daysUntilDue = calculateDaysUntilDue(effectiveDueDate);
        const isOverdue = effectiveDueDate ? daysUntilDue < 0 : false; // No effective due date means not overdue yet

        // If never completed and not snoozed, it's not "overdue" but "pending".
        // It might be better to consider tasks never completed as due immediately or very soon.
        // For now, if effectiveDueDate is null, daysUntilDue is Infinity.
        // Let's adjust: if no lastCompletedDate and not snoozed, consider it highly prioritized.
        let adjustedDaysUntilDue = daysUntilDue;
        if (!state.lastCompletedDate && !state.snoozedUntilDate) {
          adjustedDaysUntilDue = -Infinity; // Makes it top priority if sorting by daysUntilDue
        }

        return {
          ...moduleDef,
          runtimeState: state,
          dueDate: baseDueDate,
          effectiveDueDate: effectiveDueDate,
          daysUntilDue: adjustedDaysUntilDue,
          isOverdue: adjustedDaysUntilDue < 0 && effectiveDueDate !== null, // Ensure effectiveDueDate is not null
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // Sort by urgency
  }, [config.modules, runtimeStates]);

  const handleCompleteTask = useCallback((moduleId: string) => {
    setRuntimeStates((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        lastCompletedDate: new Date().toISOString(),
        snoozedUntilDate: null, // Clear snooze on completion
      },
    }));
  }, []);

  const handleSnoozeTask = useCallback(
    (moduleId: string) => {
      if (!config.allowSnooze) return;
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + config.snoozeDurationDays);
      setRuntimeStates((prev) => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          snoozedUntilDate: snoozeUntil.toISOString(),
        },
      }));
    },
    [config.allowSnooze, config.snoozeDurationDays],
  );

  const handleGenerateSession = useCallback(() => {
    let currentEffort = 0;
    const session: EnrichedModule[] = [];
    // Iterate over sorted enrichedModules (most urgent first)
    for (const module of enrichedModules) {
      // Only consider tasks that are due or overdue, or never completed
      if (
        module.daysUntilDue <= 0 ||
        module.runtimeState.lastCompletedDate === null
      ) {
        if (currentEffort + module.effort <= config.sessionEffortThreshold) {
          session.push(module);
          currentEffort += module.effort;
        } else {
          break; // Stop if adding next task exceeds threshold
        }
      }
    }
    setSuggestedSession(session);
    setActiveView("session");
  }, [enrichedModules, config.sessionEffortThreshold]);

  const groupedByLocation = useMemo(() => {
    if (activeView !== "by_location") return {};
    return enrichedModules.reduce(
      (acc, module) => {
        const location = module.location || "Uncategorized";
        if (!acc[location]) {
          acc[location] = [];
        }
        acc[location].push(module);
        return acc;
      },
      {} as Record<string, EnrichedModule[]>,
    );
  }, [enrichedModules, activeView]);

  const renderModuleItem = (
    module: EnrichedModule,
    isSessionView: boolean = false,
  ) => (
    <div
      key={module.id}
      style={{
        border: "1px solid #eee",
        padding: "10px",
        margin: "5px 0",
        borderRadius: "4px",
        backgroundColor: module.isOverdue
          ? "#fff0f0"
          : module.daysUntilDue === 0
            ? "#fffbe0"
            : "#f9f9f9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <strong style={{ fontSize: "1.1em" }}>{module.name}</strong>
        {!isSessionView && (
          <small style={{ display: "block", color: "#555" }}>
            Location: {module.location}
          </small>
        )}
        <small style={{ display: "block", color: "#555" }}>
          Effort: {module.effort}
        </small>
        <small style={{ display: "block", color: "#777" }}>
          Due:{" "}
          {formatDate(module.effectiveDueDate) ||
            (module.runtimeState.lastCompletedDate === null
              ? "Pending first completion"
              : "N/A")}
          {module.isOverdue && (
            <span style={{ color: "red", fontWeight: "bold" }}>
              {" "}
              (Overdue!)
            </span>
          )}
          {module.daysUntilDue === 0 && !module.isOverdue && (
            <span style={{ color: "#c88700", fontWeight: "bold" }}>
              {" "}
              (Due Today)
            </span>
          )}
          {module.runtimeState.snoozedUntilDate && (
            <span style={{ color: "blue" }}>
              {" "}
              (Snoozed until:{" "}
              {formatDate(new Date(module.runtimeState.snoozedUntilDate))})
            </span>
          )}
        </small>
        <small style={{ display: "block", color: "#777" }}>
          Last Completed:{" "}
          {formatDateTime(
            module.runtimeState.lastCompletedDate
              ? new Date(module.runtimeState.lastCompletedDate)
              : null,
          )}
        </small>
        {module.notes && (
          <small
            style={{ display: "block", color: "#555", fontStyle: "italic" }}
          >
            Notes: {module.notes}
          </small>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <button
          onClick={() => handleCompleteTask(module.id)}
          style={{ padding: "5px 10px" }}
        >
          Complete
        </button>
        {config.allowSnooze && !isSessionView && (
          <button
            onClick={() => handleSnoozeTask(module.id)}
            style={{ padding: "5px 10px" }}
          >
            Snooze ({config.snoozeDurationDays}d)
          </button>
        )}
      </div>
    </div>
  );

  if (!config.modules || config.modules.length === 0) {
    return (
      <p>No tasks configured. Please add tasks via the widget settings.</p>
    );
  }

  return (
    <div
      style={{
        padding: "10px",
        fontFamily: "sans-serif",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          marginBottom: "10px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveView("list")}
          disabled={activeView === "list"}
        >
          All Tasks
        </button>
        <button
          onClick={() => setActiveView("by_location")}
          disabled={activeView === "by_location"}
        >
          By Location
        </button>
        <button onClick={handleGenerateSession}>
          Suggest Session (Effort ≤ {config.sessionEffortThreshold})
        </button>
        {activeView === "session" && (
          <button onClick={() => setActiveView(config.defaultView)}>
            Back to Tasks
          </button>
        )}
      </div>

      <div style={{ flexGrow: 1, overflowY: "auto" }}>
        {activeView === "list" && (
          <div>
            <h3>All Tasks (Sorted by Urgency)</h3>
            {enrichedModules.map((module) => renderModuleItem(module))}
          </div>
        )}

        {activeView === "by_location" && (
          <div>
            <h3>Tasks By Location (Sorted by Urgency within Location)</h3>
            {Object.entries(groupedByLocation).map(
              ([location, modulesInLocation]) => (
                <div key={location} style={{ marginBottom: "15px" }}>
                  <h4>{location}</h4>
                  {modulesInLocation.map((module) => renderModuleItem(module))}
                </div>
              ),
            )}
          </div>
        )}

        {activeView === "session" && (
          <div>
            <h3>
              Suggested Session (Total Effort:{" "}
              {suggestedSession.reduce((sum, m) => sum + m.effort, 0)})
            </h3>
            {suggestedSession.length > 0 ? (
              suggestedSession.map((module) => renderModuleItem(module, true))
            ) : (
              <p>
                No tasks currently fit the session criteria, or all urgent tasks
                are done!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- ModularTaskTrackerWidget Main Component ---

export const ModularTaskTrackerWidget: React.FC<
  WidgetProps<ModularTaskTrackerConfig>
> = ({ id, config, onRemove, onWidgetConfigure }) => {
  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle || "Modular Tasks"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <ModularTaskTrackerDisplay widgetId={id} config={config} />
    </BaseWidget>
  );
};
