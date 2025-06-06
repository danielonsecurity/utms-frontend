// src/components/widgets/weather/WeatherWidgetConfigEditor.tsx

import React, { useState, useEffect, useCallback } from "react";
import { WeatherConfig } from "./types";
import { WidgetConfigComponentProps } from "../../../widgets/registry";

// Debounce hook remains the same
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export const WeatherWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<WeatherConfig>
> = ({ config, onConfigChange }) => {
  const [searchQuery, setSearchQuery] = useState(config.cityName);
  const [searchStatus, setSearchStatus] = useState(
    "Enter a city name to search.",
  );
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({
      ...config,
      temperatureUnit: e.target.value as "celsius" | "fahrenheit",
    });
  };

  // FIX: The findCity function logic is fine, and its dependencies are correct.
  // We keep it in a useCallback to ensure it's stable unless config or onConfigChange truly change.
  const findCity = useCallback(
    async (city: string) => {
      if (!city) {
        setSearchStatus("Enter a city name to search.");
        return;
      }
      setSearchStatus(`Searching for "${city}"...`);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
        );
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const cityData = data.results[0];
          const newCityName = `${cityData.name}, ${cityData.country_code}`;
          setSearchStatus(`Found: ${newCityName}`);
          onConfigChange({
            ...config,
            name: cityData.name, // Update widget title
            cityName: newCityName,
            latitude: cityData.latitude,
            longitude: cityData.longitude,
          });
        } else {
          setSearchStatus(`City "${city}" not found.`);
        }
      } catch (error) {
        console.error("Failed to fetch city data:", error);
        setSearchStatus("Error finding city. Please try again.");
      }
    },
    [config, onConfigChange],
  );

  // FIX: The main change is here in the useEffect dependency array.
  useEffect(() => {
    // This condition prevents searching for the same city again after it has been successfully found.
    if (debouncedSearchQuery && debouncedSearchQuery !== config.cityName) {
      findCity(debouncedSearchQuery);
    }
    // We intentionally omit `findCity` from the dependency array to break the loop.
    // The effect should ONLY run when the user's debounced input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, config.cityName]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div>
        <label
          htmlFor="cityName"
          style={{ display: "block", marginBottom: "5px" }}
        >
          City Name:
        </label>
        <input
          type="text"
          id="cityName"
          name="cityName"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g., London"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
        <p style={{ fontSize: "0.8em", color: "#555", marginTop: "5px" }}>
          {searchStatus}
        </p>
      </div>
      <div>
        <label
          htmlFor="temperatureUnit"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Temperature Unit:
        </label>
        <select
          id="temperatureUnit"
          name="temperatureUnit"
          value={config.temperatureUnit}
          onChange={handleUnitChange}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        >
          <option value="celsius">Celsius (°C)</option>
          <option value="fahrenheit">Fahrenheit (°F)</option>
        </select>
      </div>
    </div>
  );
};
