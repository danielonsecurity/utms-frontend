// src/api/patternsApi.ts
import { Pattern, PatternOccurrenceEvent } from "../types/patterns"; // We will define these types next

// Assume fetchApi helper exists and works as in entitiesApi.ts
async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers: defaultHeaders });
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = await response.text();
    }
    const errorMessage =
      errorData?.detail ||
      (typeof errorData === "string" ? errorData : response.statusText) ||
      "API request failed";
    console.error("API Error:", response.status, errorMessage, errorData);
    throw new Error(errorMessage);
  }
  if (response.status === 204) return undefined as T; // Problematic line
  return response.json() as Promise<T>;
}

export const patternsApi = {
  getPatterns: async (signal?: AbortSignal): Promise<Pattern[]> => {
    return fetchApi<Pattern[]>(`/api/patterns`, { signal });
  },

  createPattern: async (payload: Pattern): Promise<Pattern> => {
    return fetchApi<Pattern>(`/api/patterns`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ... Add updatePattern and deletePattern here ...

  getOccurrences: async (
    start: string,
    end: string,
    signal?: AbortSignal,
  ): Promise<PatternOccurrenceEvent[]> => {
    const params = new URLSearchParams({ start, end });
    return fetchApi<PatternOccurrenceEvent[]>(
      `/api/patterns/occurrences?${params.toString()}`,
      { signal },
    );
  },
};
