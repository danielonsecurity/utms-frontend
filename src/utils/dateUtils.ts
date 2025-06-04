export const getISODateString = (date: Date = new Date()): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

export const formatTimeToLocale = (isoTimestamp?: string): string => {
  if (!isoTimestamp) return "";
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    console.error("Error formatting time:", isoTimestamp, e);
    return "Invalid Time";
  }
};

export const getFullDateLocaleString = (isoDateString?: string): string => {
  if (!isoDateString) return "";
  try {
    // Add T00:00:00 to ensure it's parsed as local date, not UTC, for consistent display
    const date = new Date(isoDateString + "T00:00:00");
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    console.error("Error formatting full date:", isoDateString, e);
    return "Invalid Date";
  }
};

export const getDayShortName = (isoDateString: string): string => {
  try {
    const date = new Date(isoDateString + "T00:00:00"); // Ensure parsing as local date
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    // Make "Today" and "Yesterday" more prominent
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (getISODateString(date) === getISODateString(today)) return "Today";
    if (getISODateString(date) === getISODateString(yesterday))
      return "Yesterday";

    return dayName;
  } catch (e) {
    console.error("Error getting day short name:", isoDateString, e);
    return "ERR";
  }
};

export const getPastDateStrings = (
  count: number,
  referenceDate: Date = new Date(),
): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const pastDate = new Date(referenceDate);
    pastDate.setDate(referenceDate.getDate() - i);
    dates.push(getISODateString(pastDate));
  }
  return dates; // Returns [today, yesterday, dayBefore, ...]
};

export const getDateStringDaysAgo = (
  baseDateKey: string,
  daysToSubtract: number,
): string => {
  const baseDate = new Date(baseDateKey + "T12:00:00Z"); // Use midday UTC to avoid DST/TZ issues with setDate
  baseDate.setUTCDate(baseDate.getUTCDate() - daysToSubtract);
  return getISODateString(baseDate); // Assumes getISODateString formats a Date object to 'YYYY-MM-DD'
};
