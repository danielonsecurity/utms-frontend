import { CalendarEvent, CalendarSource } from "../types/calendar";

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
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const calendarApi = {
  getEvents: async (
    start: string,
    end: string,
    sources: CalendarSource[],
    signal?: AbortSignal,
  ): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams({ start, end });
    return fetchApi<CalendarEvent[]>(
      `/api/calendar/events?${params.toString()}`,
      {
        method: "POST",
        body: JSON.stringify(sources),
        signal,
      },
    );
  },
};
