// src/widgets/Routes/RoutesWidgetDefinition.ts
import { WidgetDefinition } from "../../widgets/registry";
import { RoutesWidget } from "./RoutesWidget";
import {
  RoutesConfigEditor,
  RoutesWidgetConfig,
} from "./RoutesWidgetConfigEditor"; // Ensure RoutesWidgetConfig is the updated one

const DEFAULT_ROUTES_CONFIG: RoutesWidgetConfig = {
  name: "Route Monitor",
  fromStation: null, // User must configure
  toStation: null, // User must configure
  resultsCount: 3,
  refreshIntervalSeconds: 300, // e.g., every 5 minutes
};

export const routesWidgetDefinition: WidgetDefinition<RoutesWidgetConfig> = {
  type: "route-monitor", // Changed type for clarity
  displayName: "DB Route Monitor",
  icon: "🛤️",
  component: RoutesWidget,
  configComponent: RoutesConfigEditor,
  defaultConfig: DEFAULT_ROUTES_CONFIG,
  defaultLayout: { w: 5, h: 6 }, // Might need less height initially if collapsed
  sanitizeConfig: (loadedConfig) => {
    const config = { ...DEFAULT_ROUTES_CONFIG, ...(loadedConfig || {}) };

    const sanitizeStation = (station: any) =>
      station &&
      typeof station.id === "string" &&
      typeof station.name === "string"
        ? station
        : null;

    config.fromStation = sanitizeStation(config.fromStation);
    config.toStation = sanitizeStation(config.toStation);

    config.resultsCount = Math.max(
      1,
      Math.min(
        10,
        parseInt(String(config.resultsCount), 10) ||
          DEFAULT_ROUTES_CONFIG.resultsCount,
      ),
    );
    config.refreshIntervalSeconds = Math.max(
      60,
      parseInt(String(config.refreshIntervalSeconds), 10) ||
        DEFAULT_ROUTES_CONFIG.refreshIntervalSeconds,
    );

    return config;
  },
};
