// src/components/widgets/ActivityTrackerWidget/ActivityTrackerWidgetDefinition.ts

import { WidgetDefinition } from "../../../widgets/registry";
import { ActivityTrackerWidget } from "./ActivityTrackerWidget";
import { ActivityTrackerWidgetConfigEditor } from "./ActivityTrackerWidgetConfigEditor";
import { ActivityTrackerConfig } from "./types";

const DEFAULT_ACTIVITY_TRACKER_CONFIG: ActivityTrackerConfig = {
  widgetTitle: "Activity Tracker",
  entityType: null,
  entityCategory: null,
  entityName: null,
  metadataFields: [], // Default to no extra metadata
};

export const activityTrackerWidgetDefinition: WidgetDefinition<
  ActivityTrackerConfig,
  Partial<ActivityTrackerConfig>
> = {
  type: "activity-tracker",
  displayName: "Activity Tracker",
  description:
    "Start and stop timers for any 'habit' entity with configurable metadata.",
  component: ActivityTrackerWidget,
  configComponent: ActivityTrackerWidgetConfigEditor,
  defaultConfig: DEFAULT_ACTIVITY_TRACKER_CONFIG,
  defaultLayout: { w: 4, h: 4 }, // Can be smaller
  icon: "⏱️",
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = { ...DEFAULT_ACTIVITY_TRACKER_CONFIG };
    const config = { ...defaults, ...(loadedConfig || {}) };

    config.widgetTitle =
      loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle;
    config.entityType = loadedConfig?.entityType || null;
    config.entityCategory = loadedConfig?.entityCategory || null;
    config.entityName = loadedConfig?.entityName || null;

    // Ensure metadataFields is an array and sanitize its contents
    if (Array.isArray(loadedConfig?.metadataFields)) {
      config.metadataFields = loadedConfig.metadataFields.filter(
        (f) => f && f.name && f.label && f.type,
      );
    } else {
      config.metadataFields = [];
    }

    return config;
  },
};
