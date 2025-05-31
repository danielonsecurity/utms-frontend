export function formatUtcIsoToLocalInput(
  isoString: string | null | undefined,
): string {
  if (!isoString) {
    return "";
  }
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn(
        "formatUtcIsoToLocalInput: Parsed invalid date from",
        isoString,
      );
      return "";
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // JS months 0-indexed
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    // const seconds = date.getSeconds().toString().padStart(2, '0'); // Optional

    // Format for datetime-local input value (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)
    // Let's stick to HH:MM as SS support varies
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date for input:", e);
    return "";
  }
}

export const generateHyDateTimeCode = (
  localIsoString: string,
): string | null => {
  if (!localIsoString) return null;
  try {
    const date = new Date(localIsoString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date value for Hy code generation.");
    }
    // Get UTC components
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // JS months are 0-indexed
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const microsecond = date.getUTCMilliseconds() * 1000;

    return `(datetime ${year} ${month} ${day} ${hour} ${minute} ${second} ${microsecond})`;
  } catch (e) {
    console.error("Error generating Hy datetime code:", e);
    return null; // Or throw? Returning null might be safer for handleSave
  }
};
