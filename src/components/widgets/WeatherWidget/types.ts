// src/widgets/types.ts

export interface WeatherConfig {
  name: string;
  cityName: string;
  latitude?: number;
  longitude?: number;
  temperatureUnit: "celsius" | "fahrenheit";
}

// This interface represents the object we will manually construct.
export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  precipitation_probability: number;
  precipitation: number; // The amount of rain in mm
  weathercode: number;
}
