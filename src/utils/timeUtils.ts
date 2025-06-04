export const calculateTimeFromNow = (isoTime: string | null): string => {
  if (!isoTime) return "";
  try {
    const departureTime = new Date(isoTime);
    const now = new Date();
    const diffMs = departureTime.getTime() - now.getTime();

    if (diffMs < 0) return " (Departed)"; // Or show negative time if preferred

    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      return ` (in ${diffHours}h ${diffMinutes % 60}m)`;
    } else if (diffMinutes > 0) {
      return ` (in ${diffMinutes}m)`;
    } else if (diffSeconds > 0) {
      return ` (in ${diffSeconds}s)`;
    } else {
      return " (Now)";
    }
  } catch {
    return ""; // Error parsing date
  }
};
