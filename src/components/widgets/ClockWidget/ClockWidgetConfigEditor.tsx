import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DateTime } from "luxon";

import React, { useMemo, useState, Fragment } from "react";
import { ClockConfig } from "./ClockWidget";
import { WidgetConfigComponentProps } from "../../../widgets/registry";
import "./ClockWidgetConfigEditor.css";

const COMMON_TIMEZONES = [
  "local",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
];

const getDefaultEpochDateTime = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Midnight
  return today.toISOString().slice(0, 16);
};

const ColorInput: React.FC<{
  label: string;
  name: keyof ClockConfig["theme"];
  value: string;
  onChange: (name: keyof ClockConfig["theme"], value: string) => void;
}> = ({ label, name, value, onChange }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
    }}
  >
    <label htmlFor={name} style={{ marginRight: "10px" }}>
      {label}:
    </label>
    <input
      type="color"
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      style={{ padding: "2px", height: "30px", width: "50px" }}
    />
  </div>
);

type TabKey = "general" | "dial" | "hands" | "digitalDisplay" | "theme";
const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "dial", label: "Dial & Scales" },
  { key: "hands", label: "Hands" },
  { key: "digitalDisplay", label: "Digital Display" },
  { key: "theme", label: "Theme" },
];

export const ClockWidgetConfigEditor: React.FC<
  WidgetConfigComponentProps<ClockConfig>
> = ({ config, onConfigChange }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // ... (Keep all your handler functions: handleInputChange, handleThemeChange, handleHandChange, handleGenericChange, handleNumberChange, handleCheckboxChange, applyIanaOffset, addHand, removeHand, handleHandColorChange)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "checkbox") {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      processedValue = parseFloat(value);
      if (isNaN(processedValue as number))
        processedValue = name === "divisions" ? 12 : 0; // Default based on name
    }
    // For nested properties, we might need a different handler or path notation
    if (name.includes(".")) {
      handleGenericChange(name, processedValue);
    } else {
      onConfigChange({ ...config, [name]: processedValue });
    }
  };

  const handleThemeChange = (
    themeKey: keyof ClockConfig["theme"],
    value: string,
  ) => {
    onConfigChange({
      ...config,
      theme: {
        ...config.theme,
        [themeKey]: value,
      },
    });
  };

  const handleHandChange = (
    index: number,
    field: keyof ClockHandConfig, // Ensure ClockHandConfig is accessible
    value: string | number | boolean, // Updated to include boolean for checkboxes
  ) => {
    const newHands = [...(config.hands || [])];
    if (newHands[index]) {
      let processedValue = value;
      if (
        field === "cycleDurationSeconds" ||
        field === "length" ||
        field === "widthFactor"
      ) {
        processedValue = parseFloat(value as string);
        if (isNaN(processedValue))
          processedValue =
            field === "length" || field === "widthFactor" ? 1 : 86400;
      }
      // If the value is from a checkbox and it's a string "true"/"false", convert to boolean
      if (
        typeof value === "string" &&
        (value === "true" || value === "false") &&
        (field === "smooth" ||
          field === "useInnerScale" ||
          field === "showValueDigitally")
      ) {
        processedValue = value === "true";
      }

      newHands[index] = { ...newHands[index], [field]: processedValue };
      onConfigChange({ ...config, hands: newHands });
    }
  };

  const handleGenericChange = (path: string, value: any) => {
    const keys = path.split(".");
    let current = { ...config } as any; // Use 'as any' carefully
    let nested = current;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        nested[key] = value;
      } else {
        if (!nested[key] || typeof nested[key] !== "object") {
          nested[key] = {};
        }
        nested = nested[key];
      }
    });
    onConfigChange(current as ClockConfig);
  };

  const handleNumberChange = (
    path: string,
    value: string,
    isFloat: boolean = false,
    allowNegative: boolean = false,
  ) => {
    let numVal = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(numVal)) {
      // Try to provide a sensible default based on common field names or keep it NaN to be handled by validation/sanitization
      if (path.endsWith("divisions")) numVal = 12;
      else if (path.endsWith("radiusFactor")) numVal = 0.5;
      else numVal = 0;
    }
    if (!allowNegative && numVal < 0 && !path.includes("timezoneOffsetSeconds"))
      numVal = 0; // Prevent negative for most fields
    handleGenericChange(path, numVal);
  };

  const handleCheckboxChange = (path: string, checked: boolean) => {
    handleGenericChange(path, checked);
  };

  const [ianaTimezoneForOffset, setIanaTimezoneForOffset] =
    React.useState<string>("UTC");

  const applyIanaOffset = () => {
    if (!ianaTimezoneForOffset || ianaTimezoneForOffset === "current") {
      onConfigChange({
        ...config,
        timezoneOffsetSeconds: new Date().getTimezoneOffset() * -60,
      });
      return;
    }
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en", {
        timeZone: ianaTimezoneForOffset,
        timeZoneName: "longOffset",
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === "timeZoneName");

      if (offsetPart) {
        const offsetString = offsetPart.value;
        const match = offsetString.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (match) {
          const sign = match[1] === "+" ? 1 : -1;
          const hours = parseInt(match[2], 10);
          const minutes = match[3] ? parseInt(match[3], 10) : 0;
          const offsetSeconds = sign * (hours * 3600 + minutes * 60);
          onConfigChange({ ...config, timezoneOffsetSeconds: offsetSeconds });
        } else {
          console.warn("Could not parse offset from: ", offsetString);
        }
      } else {
        console.warn("Could not determine offset for: ", ianaTimezoneForOffset);
      }
    } catch (e) {
      console.error("Error getting offset for IANA timezone:", e);
    }
  };

  const addHand = () => {
    const newHand: ClockHandConfig = {
      // Ensure ClockHandConfig is defined/imported
      name: `Hand ${(config.hands?.length || 0) + 1}`,
      cycleDurationSeconds: 60,
      color: "#888888",
      length: 0.7,
      widthFactor: 1,
      smooth: false,
      useInnerScale: false,
      showValueDigitally: false,
    };
    onConfigChange({ ...config, hands: [...(config.hands || []), newHand] });
  };

  const removeHand = (index: number) => {
    const newHands = [...(config.hands || [])];
    newHands.splice(index, 1);
    onConfigChange({ ...config, hands: newHands });
  };

  // No handleHandColorChange needed if using handleHandChange with field "color"

  const availableTimezones = useMemo(() => {
    try {
      return ["local", ...Intl.supportedValuesOf("timeZone")];
    } catch (e) {
      return COMMON_TIMEZONES;
    }
  }, []);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <>
            <div>
              <label htmlFor="clockName">Clock Name:</label>
              <input
                type="text"
                id="clockName"
                name="name"
                value={config.name || ""}
                onChange={handleInputChange}
              />
            </div>

            <fieldset>
              <legend>Cycle Start Time</legend>
              <div style={{ marginBottom: "10px" }}>
                <label>Date & Time:</label>
                <DatePicker
                  selected={(() => {
                    // If we have a saved ISO and timezone, parse it in that timezone
                    if (config.epochFixedISO && config.epochTimezone) {
                      const dt = DateTime.fromISO(config.epochFixedISO, {
                        zone: config.epochTimezone,
                      });

                      // Create a JavaScript Date in the browser's timezone with those values
                      return new Date(
                        dt.year,
                        dt.month - 1,
                        dt.day,
                        dt.hour,
                        dt.minute,
                        dt.second,
                      );
                    } else {
                      // Default: midnight today in the selected timezone
                      const timezone =
                        config.epochTimezone || DateTime.local().zoneName;
                      const dt = DateTime.now()
                        .setZone(timezone)
                        .startOf("day");

                      return new Date(
                        dt.year,
                        dt.month - 1,
                        dt.day,
                        dt.hour,
                        dt.minute,
                        dt.second,
                      );
                    }
                  })()}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const timezone =
                        config.epochTimezone || DateTime.local().zoneName;

                      // Create DateTime in the specified timezone with the selected values
                      const dt = DateTime.fromObject(
                        {
                          year: date.getFullYear(),
                          month: date.getMonth() + 1,
                          day: date.getDate(),
                          hour: date.getHours(),
                          minute: date.getMinutes(),
                          second: date.getSeconds(),
                        },
                        { zone: timezone },
                      );

                      onConfigChange({
                        ...config,
                        epochFixedISO: dt.toISO(),
                        epochTimezone: timezone,
                      });
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="clock-datetime-picker"
                />
              </div>

              <div>
                <label htmlFor="epochTimezone">Timezone:</label>
                <select
                  id="epochTimezone"
                  value={config.epochTimezone || DateTime.local().zoneName}
                  onChange={(e) => {
                    const newTimezone = e.target.value;

                    if (config.epochFixedISO) {
                      const currentDt = DateTime.fromISO(config.epochFixedISO);
                      onConfigChange({
                        ...config,
                        epochTimezone: newTimezone,
                      });
                    } else {
                      onConfigChange({
                        ...config,
                        epochTimezone: newTimezone,
                      });
                    }
                  }}
                >
                  {availableTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show the effective time in the selected timezone */}
              {config.epochFixedISO && config.epochTimezone && (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "0.85em",
                    color: "#666",
                  }}
                >
                  Effective start time:{" "}
                  {DateTime.fromISO(config.epochFixedISO)
                    .setZone(config.epochTimezone)
                    .toLocaleString(DateTime.DATETIME_FULL)}
                </div>
              )}
            </fieldset>
          </>
        );
      case "dial":
        return (
          <>
            <fieldset>
              <legend>Main Dial</legend>
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="showNumbers"
                  checked={!!config.showNumbers}
                  onChange={(e) =>
                    handleCheckboxChange("showNumbers", e.target.checked)
                  }
                />
                <label htmlFor="showNumbers">Show Main Numbers</label>
              </div>
              <div>
                <label>Main Divisions: </label>
                <input
                  type="number"
                  value={config.divisions || 12}
                  min="1"
                  onChange={(e) =>
                    handleNumberChange("divisions", e.target.value)
                  }
                  className="short-input"
                />
              </div>
              <div>
                <label>Minor Ticks per Main Division: </label>
                <input
                  type="number"
                  value={config.minorTicksPerDivision || 0}
                  min="0"
                  onChange={(e) =>
                    handleNumberChange("minorTicksPerDivision", e.target.value)
                  }
                  className="short-input"
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Inner Scale</legend>
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="innerScaleShow"
                  checked={!!config.innerScale?.show}
                  onChange={(e) =>
                    handleCheckboxChange("innerScale.show", e.target.checked)
                  }
                />
                <label htmlFor="innerScaleShow">Show Inner Scale</label>
              </div>
              {config.innerScale?.show && (
                <>
                  <div>
                    <label>Radius Factor (0.1-0.9): </label>
                    <input
                      type="number"
                      value={config.innerScale.radiusFactor || 0.6}
                      step="0.05"
                      min="0.1"
                      max="0.9"
                      onChange={(e) =>
                        handleNumberChange(
                          "innerScale.radiusFactor",
                          e.target.value,
                          true,
                        )
                      }
                      className="short-input"
                    />
                  </div>
                  <div>
                    <label>Inner Scale Divisions: </label>
                    <input
                      type="number"
                      value={config.innerScale.divisions || 60}
                      min="1"
                      onChange={(e) =>
                        handleNumberChange(
                          "innerScale.divisions",
                          e.target.value,
                        )
                      }
                      className="short-input"
                    />
                  </div>
                  <div className="checkbox-container">
                    <input
                      type="checkbox"
                      id="innerScaleShowNumbers"
                      checked={!!config.innerScale.showNumbers}
                      onChange={(e) =>
                        handleCheckboxChange(
                          "innerScale.showNumbers",
                          e.target.checked,
                        )
                      }
                    />
                    <label htmlFor="innerScaleShowNumbers">
                      Show Inner Numbers
                    </label>
                  </div>
                  <div className="color-input-container">
                    <label>Inner Tick Color: </label>
                    <input
                      type="color"
                      value={
                        config.innerScale.tickColor || config.theme.tickColor
                      }
                      onChange={(e) =>
                        handleGenericChange(
                          "innerScale.tickColor",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="color-input-container">
                    <label>Inner Number Color: </label>
                    <input
                      type="color"
                      value={
                        config.innerScale.numberColor || config.theme.textColor
                      }
                      onChange={(e) =>
                        handleGenericChange(
                          "innerScale.numberColor",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </>
              )}
            </fieldset>
          </>
        );
      case "hands":
        return (
          <fieldset>
            <legend>Hands</legend>
            {(config.hands || []).map((hand, index) => (
              <div key={index} className="hand-config-item">
                <div>
                  {" "}
                  {/* For Name and Remove Button */}
                  <input
                    type="text"
                    placeholder="Hand Name"
                    value={hand.name || ""}
                    onChange={(e) =>
                      handleHandChange(index, "name", e.target.value)
                    }
                    style={{
                      fontWeight: "bold",
                      border: "none",
                      borderBottom: "1px solid #ccc",
                      flexGrow: 1,
                    }}
                  />
                  <button
                    onClick={() => removeHand(index)}
                    className="icon-button danger"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label>Cycle Duration (s): </label>
                  <input
                    type="number"
                    value={hand.cycleDurationSeconds}
                    min="1"
                    onChange={(e) =>
                      handleHandChange(
                        index,
                        "cycleDurationSeconds",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <label>Length (0.1-1.0): </label>
                  <input
                    type="number"
                    value={hand.length}
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    onChange={(e) =>
                      handleHandChange(
                        index,
                        "length",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <label>Width Factor: </label>
                  <input
                    type="number"
                    value={hand.widthFactor || 1}
                    step="0.1"
                    min="0.1"
                    onChange={(e) =>
                      handleHandChange(
                        index,
                        "widthFactor",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <label>Color: </label>
                  <input
                    type="color"
                    value={hand.color}
                    onChange={(e) =>
                      handleHandChange(index, "color", e.target.value)
                    }
                  />
                </div>
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={`smooth-${index}`}
                    checked={!!hand.smooth}
                    onChange={(e) =>
                      handleHandChange(index, "smooth", e.target.checked)
                    }
                  />
                  <label htmlFor={`smooth-${index}`} className="inline-label">
                    Smooth Movement
                  </label>
                </div>
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={`useInner-${index}`}
                    checked={!!hand.useInnerScale}
                    disabled={!config.innerScale?.show}
                    onChange={(e) =>
                      handleHandChange(index, "useInnerScale", e.target.checked)
                    }
                  />
                  <label htmlFor={`useInner-${index}`} className="inline-label">
                    Use Inner Scale
                  </label>
                </div>
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={`showDigital-${index}`}
                    checked={!!hand.showValueDigitally}
                    disabled={!config.showDigitalDisplay}
                    onChange={(e) =>
                      handleHandChange(
                        index,
                        "showValueDigitally",
                        e.target.checked,
                      )
                    }
                  />
                  <label
                    htmlFor={`showDigital-${index}`}
                    className="inline-label"
                  >
                    Show in Digital Display
                  </label>
                </div>
              </div>
            ))}
            <button onClick={addHand}>+ Add Hand</button>
          </fieldset>
        );
      case "digitalDisplay":
        return (
          <>
            <fieldset>
              <legend>Digital Display Settings</legend>
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="showDigitalDisplay"
                  checked={!!config.showDigitalDisplay}
                  onChange={(e) =>
                    handleCheckboxChange("showDigitalDisplay", e.target.checked)
                  }
                />
                <label htmlFor="showDigitalDisplay">
                  Show Digital Time Below Clock
                </label>
              </div>
              {config.showDigitalDisplay && (
                <>
                  <div>
                    <label htmlFor="digitalDisplayHourFormat">
                      Hour Format:{" "}
                    </label>
                    <select
                      id="digitalDisplayHourFormat"
                      name="digitalDisplayHourFormat"
                      value={config.digitalDisplayHourFormat || "12h"}
                      onChange={handleInputChange}
                    >
                      <option value="12h">12-hour</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="digitalDisplayFormat">
                      Format String:{" "}
                    </label>
                    <input
                      type="text"
                      id="digitalDisplayFormat"
                      name="digitalDisplayFormat"
                      value={config.digitalDisplayFormat || ""}
                      onChange={handleInputChange}
                      placeholder="h:mm:ss A or HH:mm"
                    />
                    <small>
                      Placeholders: HH, H, hh, h, mm, m, ss, s, A (for
                      AM/PM/Cycle). Use {"{HandName}"} for custom hands.
                    </small>
                  </div>
                  <p className="form-note" style={{ marginTop: "10px" }}>
                    AM/PM/Cycle indicators ('A' placeholder) use
                    `digitalDisplayCycleIndicators` from JSON config.
                  </p>
                </>
              )}
            </fieldset>
          </>
        );
      case "theme":
        return (
          <fieldset>
            <legend>Theme Colors</legend>
            {/* Use a wrapper div for ColorInput if you want to style its layout further, or style ColorInput's root div directly if it has a class */}
            <div className="color-input-container">
              <ColorInput
                label="Frame Color"
                name="frameColor"
                value={config.theme?.frameColor || "#000000"}
                onChange={handleThemeChange}
              />
            </div>
            <div className="color-input-container">
              <ColorInput
                label="Background Color"
                name="backgroundColor"
                value={config.theme?.backgroundColor || "#FFFFFF"}
                onChange={handleThemeChange}
              />
            </div>
            <div className="color-input-container">
              <ColorInput
                label="Number/Text Color"
                name="textColor"
                value={config.theme?.textColor || "#000000"}
                onChange={handleThemeChange}
              />
            </div>
            <div className="color-input-container">
              <ColorInput
                label="Tick Color"
                name="tickColor"
                value={config.theme?.tickColor || "#000000"}
                onChange={handleThemeChange}
              />
            </div>
            <div className="color-input-container">
              <ColorInput
                label="Minor Tick Color"
                name="minorTickColor"
                value={
                  config.theme?.minorTickColor ||
                  config.theme?.tickColor ||
                  "#333333"
                }
                onChange={handleThemeChange}
              />
            </div>
            <div className="color-input-container">
              <ColorInput
                label="Center Dot Color"
                name="centerDotColor"
                value={config.theme?.centerDotColor || "#FF0000"}
                onChange={handleThemeChange}
              />
            </div>
          </fieldset>
        );
      default:
        return null;
    }
  };

  return (
    <div className="clock-config-editor">
      <div className="clock-config-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`clock-config-tab-button ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="clock-config-tab-content">{renderActiveTabContent()}</div>

      <p className="form-note">
        Note: Changes are applied immediately. Close the modal to save.
      </p>
    </div>
  );
};
