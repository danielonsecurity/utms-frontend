import { ClockWidget, ClockConfig } from "./ClockWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { ClockWidgetConfigEditor } from "./ClockWidgetConfigEditor";

const STANDARD_ISH_CLOCK_CONFIG: ClockConfig = {
  name: "Analog Clock",
  timezoneOffsetSeconds: new Date().getTimezoneOffset() * -60,

  showNumbers: true,
  divisions: 12,
  minorTicksPerDivision: 4,

  innerScale: {
    show: true,
    radiusFactor: 0.75,
    divisions: 60,
    showNumbers: false,
    tickColor: "#999999",
    numberColor: "#777777",
    tickLengthFactor: 0.04,
    numberFontSizeFactor: 0.07,
  },

  showDigitalDisplay: true,
  digitalDisplayHourFormat: "12h",
  digitalDisplayCycleIndicators: [
    {
      sourceHandNameMatcher: "hour",
      referenceCycleSeconds: 24 * 60 * 60,
      indicators: [
        { label: "AM", startFraction: 0.0, endFraction: 0.5 },
        { label: "PM", startFraction: 0.5, endFraction: 1.0 },
      ],
    },
  ],

  epochReference: "todayLocalMidnight",

  theme: {
    frameColor: "#333333",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    tickColor: "#666666",
    minorTickColor: "#AAAAAA",
    centerDotColor: "#ff0000",
  },
  hands: [
    {
      name: "Hours",
      cycleDurationSeconds: 12 * 60 * 60,
      color: "#000000",
      length: 0.5,
      widthFactor: 1.4,
      smooth: true,
      showValueDigitally: true,
    },
    {
      name: "Minutes",
      cycleDurationSeconds: 60 * 60,
      color: "#333333",
      length: 0.75,
      widthFactor: 1.0,
      smooth: true,
      showValueDigitally: true,
    },
    {
      name: "Seconds",
      cycleDurationSeconds: 60,
      color: "#ff0000",
      length: 0.85,
      widthFactor: 0.7,
      smooth: false,
      useInnerScale: true,
      showValueDigitally: true,
    },
  ],
};

const DEFAULT_CLOCK_CONFIG_FULL: ClockConfig = STANDARD_ISH_CLOCK_CONFIG;

export const clockWidgetDefinition: WidgetDefinition<
  ClockConfig,
  Partial<ClockConfig>
> = {
  type: "clock",
  displayName: "Analog Cycle Clock",
  component: ClockWidget,
  defaultConfig: JSON.parse(JSON.stringify(DEFAULT_CLOCK_CONFIG_FULL)),
  defaultLayout: { w: 4, h: 4 },
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const absoluteDefault = JSON.parse(
      JSON.stringify(DEFAULT_CLOCK_CONFIG_FULL),
    );

    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Clock ${idNumPart || widgetId.substring(widgetId.length - 3)}`;
    const config: ClockConfig = {
      name: /* ... name logic ... */ defaultInstanceName, // Ensure name is set
      timezoneOffsetSeconds:
        typeof loadedConfig?.timezoneOffsetSeconds === "number"
          ? loadedConfig.timezoneOffsetSeconds
          : absoluteDefault.timezoneOffsetSeconds,

      showNumbers:
        typeof loadedConfig?.showNumbers === "boolean"
          ? loadedConfig.showNumbers
          : absoluteDefault.showNumbers,
      divisions:
        typeof loadedConfig?.divisions === "number" &&
        loadedConfig.divisions > 0
          ? loadedConfig.divisions
          : absoluteDefault.divisions,
      minorTicksPerDivision:
        typeof loadedConfig?.minorTicksPerDivision === "number" &&
        loadedConfig.minorTicksPerDivision >= 0
          ? loadedConfig.minorTicksPerDivision
          : absoluteDefault.minorTicksPerDivision,

      innerScale: {
        // Deep merge innerScale
        ...absoluteDefault.innerScale,
        ...(loadedConfig?.innerScale || {}),
        show:
          typeof loadedConfig?.innerScale?.show === "boolean"
            ? loadedConfig.innerScale.show
            : absoluteDefault.innerScale.show,
        // Ensure other innerScale numbers are valid
      },

      showDigitalDisplay:
        typeof loadedConfig?.showDigitalDisplay === "boolean"
          ? loadedConfig.showDigitalDisplay
          : absoluteDefault.showDigitalDisplay,
      digitalDisplayFormat:
        loadedConfig?.digitalDisplayFormat ||
        absoluteDefault.digitalDisplayFormat,

      digitalDisplayHourFormat:
        loadedConfig?.digitalDisplayHourFormat ||
        absoluteDefault.digitalDisplayHourFormat,
      digitalDisplayCycleIndicators:
        loadedConfig?.digitalDisplayCycleIndicators ||
        JSON.parse(
          JSON.stringify(absoluteDefault.digitalDisplayCycleIndicators),
        ),

      epochReference:
        loadedConfig?.epochReference || absoluteDefault.epochReference,
      epochFixedISO:
        loadedConfig?.epochFixedISO || absoluteDefault.epochFixedISO,
      epochTimezone:
        loadedConfig?.epochTimezone || absoluteDefault.epochTimezone || "local",
      theme: {
        // Deep merge theme
        ...absoluteDefault.theme,
        ...(loadedConfig?.theme || {}),
      },
      hands:
        loadedConfig?.hands && Array.isArray(loadedConfig.hands)
          ? loadedConfig.hands.map(
              (h: Partial<ClockHandConfig>, index: number) => ({
                // Ensure each hand is complete
                name: h.name || `Hand ${index + 1}`,
                cycleDurationSeconds:
                  typeof h.cycleDurationSeconds === "number" &&
                  h.cycleDurationSeconds > 0
                    ? h.cycleDurationSeconds
                    : absoluteDefault.hands[index]?.cycleDurationSeconds || 60,
                color:
                  h.color || absoluteDefault.hands[index]?.color || "#000000",
                length:
                  typeof h.length === "number"
                    ? Math.max(0.1, Math.min(1, h.length))
                    : absoluteDefault.hands[index]?.length || 0.7,
                widthFactor:
                  typeof h.widthFactor === "number"
                    ? h.widthFactor
                    : absoluteDefault.hands[index]?.widthFactor || 1,
                smooth:
                  typeof h.smooth === "boolean"
                    ? h.smooth
                    : absoluteDefault.hands[index]?.smooth || false,
                useInnerScale:
                  typeof h.useInnerScale === "boolean"
                    ? h.useInnerScale
                    : absoluteDefault.hands[index]?.useInnerScale || false,
                showValueDigitally:
                  typeof h.showValueDigitally === "boolean"
                    ? h.showValueDigitally
                    : absoluteDefault.hands[index]?.showValueDigitally || false,
              }),
            )
          : absoluteDefault.hands.map((h) => ({ ...h })),
    };
    config.name = loadedConfig?.name || absoluteDefault.name;
    if (typeof config.timezone !== "string" || config.timezone.trim() === "") {
      config.timezone = DEFAULT_CLOCK_CONFIG_FULL.timezone;
    }

    if (typeof config.showNumbers !== "boolean") {
      config.showNumbers = DEFAULT_CLOCK_CONFIG_FULL.showNumbers;
    }
    return config;
  },
  icon: "🕒",
  configComponent: ClockWidgetConfigEditor,
};
