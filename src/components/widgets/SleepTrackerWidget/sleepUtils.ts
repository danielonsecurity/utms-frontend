import { getISODateString as commonGetISODateString } from "../../../utils/dateUtils"; // Assuming dateUtils.ts is in the same folder or adjust path

export const getISODateString = commonGetISODateString; // Re-export for local use

export const formatTimeForInput = (timeSource?: string | Date): string => {
  if (!timeSource) return "";

  let dateObj: Date;

  if (typeof timeSource === "string") {
    if (timeSource.includes("T") || timeSource.includes(":")) {
      const todayForTimeParsing = new Date(); // Use today's date for parsing time-only strings
      dateObj = new Date(
        `${todayForTimeParsing.toISOString().split("T")[0]}T${timeSource}`,
      );
      if (isNaN(dateObj.getTime())) {
        // If parsing as part of today fails, it might be a full ISO
        dateObj = new Date(timeSource);
      }
    } else {
      // Not a recognizable time format string
      return "";
    }
  } else if (timeSource instanceof Date) {
    dateObj = timeSource;
  } else {
    return ""; // Invalid input type
  }

  if (isNaN(dateObj.getTime())) {
    console.warn(
      "formatTimeForInput: Could not parse timeSource into a valid Date:",
      timeSource,
    );
    return ""; // Invalid date
  }

  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export interface SleepDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
  displayText: string;
}

export const calculateSleepDuration = (
  date: string, // YYYY-MM-DD of sleep start
  sleepStart: string, // HH:MM
  sleepEnd: string, // HH:MM
): SleepDuration | null => {
  if (!date || !sleepStart || !sleepEnd) return null;

  try {
    const startDateTime = new Date(`${date}T${sleepStart}:00`);
    let endDateTime = new Date(`${date}T${sleepEnd}:00`);

    // If sleepEnd is earlier than sleepStart, assume it's on the next day
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()))
      return null;

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    if (diffMs < 0) return null; // Should not happen if next day logic is correct

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      hours,
      minutes,
      totalMinutes,
      displayText: `${hours}h ${minutes}m`,
    };
  } catch (e) {
    console.error("Error calculating sleep duration:", e);
    return null;
  }
};

export const calidadEmojis: { [key: number]: string } = {
  1: "💀", // Awful
  2: "😟", // Poor
  3: "😐", // Okay
  4: "😊", // Good
  5: "✨", // Great/Excellent
};

export const calidadTooltips: { [key: number]: string } = {
  1: "Awful",
  2: "Poor",
  3: "Okay",
  4: "Good",
  5: "Great!",
};
