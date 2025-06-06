// src/components/widgets/weather/weatherWidgetDefinition.ts

import { WidgetDefinition } from "../../../widgets/registry";
import { WeatherConfig } from "./types";
import { WeatherWidget } from "./WeatherWidget";
import { WeatherWidgetConfigEditor } from "./WeatherWidgetConfigEditor";

const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  name: "Weather",
  cityName: "Berlin, DE",
  latitude: 52.52,
  longitude: 13.41,
  temperatureUnit: "celsius",
};

export const weatherWidgetDefinition: WidgetDefinition<
  WeatherConfig,
  Partial<WeatherConfig>
> = {
  type: "weather",
  displayName: "Weather",
  component: WeatherWidget,
  defaultConfig: DEFAULT_WEATHER_CONFIG,
  defaultLayout: { w: 6, h: 4 }, // A bit wider and taller for the chart
  configComponent: WeatherWidgetConfigEditor,
  sanitizeConfig: (loadedConfig) => {
    const config = { ...DEFAULT_WEATHER_CONFIG, ...loadedConfig };

    // Ensure essential numeric fields are valid
    if (typeof config.latitude !== "number")
      config.latitude = DEFAULT_WEATHER_CONFIG.latitude;
    if (typeof config.longitude !== "number")
      config.longitude = DEFAULT_WEATHER_CONFIG.longitude;

    // Ensure unit is a valid value
    if (
      config.temperatureUnit !== "celsius" &&
      config.temperatureUnit !== "fahrenheit"
    ) {
      config.temperatureUnit = DEFAULT_WEATHER_CONFIG.temperatureUnit;
    }

    return config;
  },
  icon: "🌦️",
};
