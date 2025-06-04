// src/widgets/Departures/DeparturesWidgetDefinition.ts
import { WidgetDefinition } from "../../widgets/registry";
import { DeparturesWidget } from "./DeparturesWidget";
import {
  DeparturesConfigEditor,
  DeparturesConfig,
} from "./DeparturesWidgetConfigEditor";
// Assuming dbApiTypes.ts still holds TRANSPORTATION_API_PROFILES if needed for reference,
// but it's not directly used in config anymore.

const DEFAULT_DEPARTURES_CONFIG: DeparturesConfig = {
  // Ensure DeparturesConfig is the updated interface
  name: "Departures",
  stations: [],
  // apiProfile: 'dbnav', // REMOVED
  maxDepartures: 7,
  departureWindowMinutes: 60,
  refreshIntervalSeconds: 60,
  stationFilters: [],
};

export const departuresWidgetDefinition: WidgetDefinition<DeparturesConfig> = {
  type: "departures-board", // New unique type
  displayName: "DB Departures Board",
  icon: "🚆",
  component: DeparturesWidget,
  configComponent: DeparturesConfigEditor,
  defaultConfig: DEFAULT_DEPARTURES_CONFIG,
  defaultLayout: { w: 4, h: 7 }, // Was h:8, might be okay with h:7 now
  sanitizeConfig: (loadedConfig, widgetId) => {
    const config: DeparturesConfig = {
      ...DEFAULT_DEPARTURES_CONFIG,
      ...(loadedConfig || {}),
    };

    config.stations = Array.isArray(config.stations)
      ? config.stations.filter(
          (s) => s && typeof s.id === "string" && typeof s.name === "string",
        )
      : [];

    // apiProfile sanitization REMOVED

    config.maxDepartures = Math.max(
      1,
      Math.min(
        25,
        parseInt(String(config.maxDepartures), 10) ||
          DEFAULT_DEPARTURES_CONFIG.maxDepartures,
      ),
    );
    config.departureWindowMinutes = Math.max(
      10,
      Math.min(
        720,
        parseInt(String(config.departureWindowMinutes), 10) ||
          DEFAULT_DEPARTURES_CONFIG.departureWindowMinutes,
      ),
    );
    config.refreshIntervalSeconds = Math.max(
      30,
      parseInt(String(config.refreshIntervalSeconds), 10) ||
        DEFAULT_DEPARTURES_CONFIG.refreshIntervalSeconds,
    );
    config.stationFilters = Array.isArray(config.stationFilters)
      ? config.stationFilters.map((sf) => ({
          stationId: sf.stationId,
          filters: Array.isArray(sf.filters)
            ? sf.filters.filter(
                (f) =>
                  typeof f.lineName === "string" && typeof f.show === "boolean",
              )
            : [],
        }))
      : [];

    return config;
  },
};
