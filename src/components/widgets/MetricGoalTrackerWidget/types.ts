// metricGoalTracker/types.ts

export interface MetricAdjustmentLogEntry {
  id: string;
  timestamp: string; // ISO string
  valueLogged: number; // The actual value recorded at this time (this is the NEW value for the metric, not the delta)
  valueDelta?: number; // Optional: The change that was applied (e.g., +50, -10, or template_value * quantity)
  // This is new and will be useful for "sum over time period" charts
  notes?: string;
}

export interface MetricZone {
  id: string;
  label: string;
  color: string;
  lowerBound?: number;
  upperBound?: number;
  description?: string;
}

export interface MetricLogTemplate {
  id: string;
  name: string;
  value: number; // The delta value this template represents (positive for additions, negative for reductions)
  description?: string;
}

export interface MetricGoal {
  id: string;
  name: string;
  unit: string;
  description?: string;

  currentValue: number; // Always the latest absolute value
  log: MetricAdjustmentLogEntry[];
  zones: MetricZone[];
  logTemplates?: MetricLogTemplate[];

  displayMin?: number; // This might become part of ChartConfig or be a global Y-axis hint
  displayMax?: number; // Same as above

  creationTimestamp: string;
  lastLogTimestamp?: string;
}

// New types for chart configuration
export type ChartRenderType =
  | "raw_values"
  | "aggregated_sum"
  | "moving_average";
export type TimePeriod = "hourly" | "daily" | "weekly" | "monthly" | "custom"; // For aggregation/averaging

export interface ChartConfig {
  id: string;
  title: string;
  renderType: ChartRenderType;

  // For 'aggregated_sum'
  aggregationTimePeriod?: TimePeriod; // e.g., 'daily', 'weekly'
  aggregationCustomSeconds?: number; // if aggregationTimePeriod is 'custom'

  // For 'moving_average'
  movingAverageTimePeriod?: TimePeriod; // e.g., 'daily', 'weekly'
  movingAverageCustomSeconds?: number; // if movingAverageTimePeriod is 'custom'

  // Y-axis overrides specific to this chart
  yAxisDisplayMin?: number;
  yAxisDisplayMax?: number;
}

export interface MetricGoalTrackerConfig {
  widgetTitle: string;
  goal?: MetricGoal; // A single goal, optional if not yet configured
  charts: ChartConfig[];
}
