import { ContextEntry } from "./ContextSwitcherWidget";

const API_BASE = "/api"; // Assuming your FastAPI is served under /api

/**
 * The shape of the response from our backend's LogEntryResponse model.
 * Timestamps are ISO strings.
 */
interface LogEntryApiResponse {
  context_name: string;
  start_time: string;
  end_time: string | null;
  color: string | null;
}

/**
 * Converts a backend API response object into the frontend's ContextEntry type.
 */
function apiToContextEntry(
  apiEntry: LogEntryApiResponse,
  id: string,
): ContextEntry {
  return {
    id, // We'll generate a temporary ID on the frontend for React keys
    name: apiEntry.context_name,
    startTime: new Date(apiEntry.start_time).getTime(),
    endTime: apiEntry.end_time ? new Date(apiEntry.end_time).getTime() : null,
    color: apiEntry.color || "#cccccc", // Default color if not provided
  };
}

/**
 * Fetches all log entries for a given date.
 */
export async function getDailyLog(date: Date): Promise<ContextEntry[]> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await fetch(`${API_BASE}/dailylog/${dateStr}`);

  if (!response.ok) {
    console.error("Failed to fetch daily log:", response.statusText);
    throw new Error("Failed to fetch daily log");
  }

  const data: LogEntryApiResponse[] = await response.json();

  // Sort by start time and map to frontend type
  return data
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )
    .map((entry, index) => apiToContextEntry(entry, `api-${dateStr}-${index}`));
}

/**
 * Switches the current context.
 * The backend will end the previous context and start a new one.
 */
export async function switchContext(
  newContextName: string,
): Promise<ContextEntry[]> {
  const response = await fetch(`${API_BASE}/dailylog/switch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ context_name: newContextName }),
  });

  if (!response.ok) {
    console.error("Failed to switch context:", response.statusText);
    throw new Error("Failed to switch context");
  }

  const data: LogEntryApiResponse[] = await response.json();

  const today = new Date().toISOString().split("T")[0];
  // Sort by start time and map to frontend type
  return data
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )
    .map((entry, index) => apiToContextEntry(entry, `api-${today}-${index}`));
}
