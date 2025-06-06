// src/components/widgets/weather/WeatherWidget.tsx

import React, { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import { WeatherConfig, CurrentWeather } from "./types";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";

// --- Interfaces for API & Chart Data (No changes needed) ---
interface HourlyData {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weathercode: number[];
}
interface HourlyApiResponse {
  hourly: HourlyData;
}
interface FormattedHourData {
  time: string;
  temp: number;
  precipChance: number;
  precipAmount: number;
  weathercode: number;
}
interface WeatherDisplayProps {
  config: WeatherConfig;
}

// --- Helper Functions (No changes needed) ---
const getWeatherInfo = (code: number) => {
  // ... (same as before)
  const codeMap: { [key: number]: { icon: string; description: string } } = {
    0: { icon: "☀️", description: "Clear sky" },
    1: { icon: "🌤️", description: "Mainly clear" },
    2: { icon: "⛅️", description: "Partly cloudy" },
    3: { icon: "☁️", description: "Overcast" },
    45: { icon: "🌫️", description: "Fog" },
    48: { icon: "🌫️", description: "Depositing rime fog" },
    51: { icon: "🌦️", description: "Light drizzle" },
    53: { icon: "🌦️", description: "Moderate drizzle" },
    55: { icon: "🌦️", description: "Dense drizzle" },
    61: { icon: "🌧️", description: "Slight rain" },
    63: { icon: "🌧️", description: "Moderate rain" },
    65: { icon: "🌧️", description: "Heavy rain" },
    80: { icon: "🌧️", description: "Slight rain showers" },
    81: { icon: "🌧️", description: "Moderate rain showers" },
    82: { icon: "⛈️", description: "Heavy rain showers" },
    95: { icon: "⛈️", description: "Thunderstorm" },
  };
  return codeMap[code] || { icon: "🤷", description: "Unknown" };
};
const CustomTooltip = ({ active, payload, label }: any) => {
  // ... (same as before)
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { icon, description } = getWeatherInfo(data.weathercode);
    return (
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #ccc",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: 0, fontWeight: "bold" }}>{label}</p>
        <p style={{ margin: "5px 0 0" }}>{`${icon} ${description}`}</p>
        <p
          style={{ margin: "5px 0 0", color: "#ff7300" }}
        >{`Temp: ${data.temp}°`}</p>
        <p
          style={{ margin: "5px 0 0", color: "#3498db" }}
        >{`Rain Chance: ${data.precipChance}%`}</p>
        {data.precipAmount > 0 && (
          <p
            style={{ margin: "5px 0 0", color: "#28a745" }}
          >{`Precipitation: ${data.precipAmount}mm`}</p>
        )}
      </div>
    );
  }
  return null;
};

// --- Main Display Component ---
const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ config }) => {
  const [chartData, setChartData] = useState<FormattedHourData[] | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  );
  const [currentHourIndex, setCurrentHourIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data fetching logic (No changes needed)
  const fetchWeather = useCallback(
    async (isInitialLoad: boolean) => {
      // ... (same as before)
      if (isInitialLoad) setLoading(true);
      setError(null);
      const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${config.latitude}&longitude=${config.longitude}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode&temperature_unit=${config.temperatureUnit}&past_days=1&forecast_days=1&timezone=auto`;
      try {
        const response = await fetch(API_URL);
        if (!response.ok)
          throw new Error(`API Error: Failed to fetch weather data.`);
        const data: HourlyApiResponse = await response.json();
        const {
          time,
          temperature_2m,
          apparent_temperature,
          precipitation_probability,
          precipitation,
          weathercode,
        } = data.hourly;
        const now = new Date();
        let nowIndex = time.findIndex((t) => new Date(t) > now);
        nowIndex =
          nowIndex === -1 ? time.length - 1 : Math.max(0, nowIndex - 1);
        const nowWeather: CurrentWeather = {
          temperature_2m: temperature_2m[nowIndex],
          apparent_temperature: apparent_temperature[nowIndex],
          precipitation_probability: precipitation_probability[nowIndex],
          precipitation: precipitation[nowIndex],
          weathercode: weathercode[nowIndex],
        };
        setCurrentWeather(nowWeather);
        const startIndex = Math.max(0, nowIndex - 12);
        const endIndex = startIndex + 24;
        const formattedWindowData: FormattedHourData[] = [];
        for (let i = startIndex; i < endIndex && i < time.length; i++) {
          formattedWindowData.push({
            time: new Date(time[i]).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            temp: Math.round(temperature_2m[i]),
            precipChance: precipitation_probability[i],
            precipAmount: precipitation[i],
            weathercode: weathercode[i],
          });
        }
        setChartData(formattedWindowData);
        setCurrentHourIndex(nowIndex - startIndex);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        setLoading(false);
      }
    },
    [config.latitude, config.longitude, config.temperatureUnit],
  );

  useEffect(() => {
    // ... (same as before)
    if (!config.latitude || !config.longitude) {
      setError("City not configured.");
      setLoading(false);
      return;
    }
    fetchWeather(true);
    const intervalId = setInterval(() => fetchWeather(false), 900000);
    return () => clearInterval(intervalId);
  }, [fetchWeather, config.latitude, config.longitude]);

  // --- Rendering Logic with the FIX ---
  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
    );
  if (error)
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
        {error}
      </div>
    );
  if (!chartData || !currentWeather)
    return <div style={{ textAlign: "center", padding: "20px" }}>No data.</div>;

  const tempUnit = config.temperatureUnit === "celsius" ? "°C" : "°F";
  const { icon: weatherIcon } = getWeatherInfo(currentWeather.weathercode);

  // --- THE FIX ---
  // Get the actual time string for the current hour index from the chart's data.
  // This is more reliable than passing a raw index number to the ReferenceLine.
  const nowLineX =
    chartData && currentHourIndex !== null
      ? chartData[currentHourIndex]?.time
      : undefined;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "15px",
          gap: "15px",
        }}
      >
        <span style={{ fontSize: "2.5rem" }}>{weatherIcon}</span>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
            {Math.round(currentWeather.temperature_2m)}
            {tempUnit}
          </div>
          <div style={{ fontSize: "1rem", color: "#555" }}>
            Feels like {Math.round(currentWeather.apparent_temperature)}
            {tempUnit}
          </div>
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "#555",
            borderLeft: "1px solid #ccc",
            paddingLeft: "15px",
          }}
        >
          <div>
            💧 Chance:{" "}
            <strong>{currentWeather.precipitation_probability}%</strong>
          </div>
          {currentWeather.precipitation > 0 && (
            <div>
              Amount: <strong>{currentWeather.precipitation}mm/hr</strong>
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={2} />
          <YAxis
            yAxisId="left"
            label={{
              value: `Temp (${tempUnit})`,
              angle: -90,
              position: "insideLeft",
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{ value: "Chance (%)", angle: 90, position: "insideRight" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />

          {/* --- APPLYING THE FIX --- */}
          {/* Use the actual time string for the 'x' prop. This is the most robust method. */}
          {nowLineX && (
            <ReferenceLine
              yAxisId="left"
              x={nowLineX}
              stroke="red"
              strokeDasharray="3 3"
            >
              <Label value="Now" position="top" fill="red" fontSize={12} />
            </ReferenceLine>
          )}

          <Bar
            yAxisId="left"
            dataKey="precipAmount"
            name="Precipitation (mm)"
            fill="#28a745"
            barSize={15}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="precipChance"
            name="Rain Chance"
            stroke="#3498db"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temp"
            name="Temperature"
            stroke="#ff7300"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeatherWidget: React.FC<WidgetProps<WeatherConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  return (
    <BaseWidget
      id={id}
      title={`${config.name || "Weather"} in ${config.cityName}`}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <WeatherDisplay config={config} />
    </BaseWidget>
  );
};
