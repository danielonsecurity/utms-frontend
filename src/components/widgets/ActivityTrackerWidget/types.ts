/**
 * Represents a single entity that the user has chosen to track.
 */
export interface TrackedActivity {
  id: string; // A unique key for React, e.g., "habit:routines:Morning Routine"
  entityType: string;
  entityCategory: string;
  entityName: string;
}

/**
 * Defines a single piece of metadata to be collected when an activity is logged.
 */
export interface MetadataFieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "rating";
}

/**
 * Configuration for the Activity Tracker Widget.
 */
export interface ActivityTrackerConfig {
  widgetTitle: string;
  trackedActivities: TrackedActivity[]; // Changed from single entity
  metadataFields: MetadataFieldDef[];
}
