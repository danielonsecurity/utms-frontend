import { TimerWidget, TimerConfig } from "./TimerWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { TimerWidgetConfigEditor } from "./TimerWidgetConfigEditor";

const DEFAULT_TIMER_CONFIG: TimerConfig = {
  name: "New Timer",
  duration_expression: "5m",
  duration_seconds: 300,
  autoStart: false,
  soundEnabled: true,
  notificationEnabled: true,
  alarmSoundSrc: "/sounds/alarm.wav",
};

export const timerWidgetDefinition: WidgetDefinition<
  TimerConfig,
  Partial<TimerConfig>
> = {
  type: "timer",
  displayName: "Timer",
  component: TimerWidget,
  defaultConfig: DEFAULT_TIMER_CONFIG,
  defaultLayout: { w: 3, h: 3 },
  configComponent: TimerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Timer ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    const config = {
      ...DEFAULT_TIMER_CONFIG,
      ...(loadedConfig || {}),
    };
    config.autoStart =
      typeof config.autoStart === "boolean"
        ? config.autoStart
        : DEFAULT_TIMER_CONFIG.autoStart;
    config.soundEnabled =
      typeof config.soundEnabled === "boolean"
        ? config.soundEnabled
        : DEFAULT_TIMER_CONFIG.soundEnabled;
    config.notificationEnabled =
      typeof config.notificationEnabled === "boolean"
        ? config.notificationEnabled
        : DEFAULT_TIMER_CONFIG.notificationEnabled;

    if (!config.name || config.name === DEFAULT_TIMER_CONFIG.name) {
      config.name =
        loadedConfig?.name || currentDashboardTitle || defaultInstanceName;
    }
    const parsedSeconds = parseInt(String(config.duration_seconds), 10);
    config.duration_seconds =
      !isNaN(parsedSeconds) && parsedSeconds > 0
        ? parsedSeconds
        : DEFAULT_TIMER_CONFIG.duration_seconds;
    if (!config.duration_expression) {
      config.duration_expression = DEFAULT_TIMER_CONFIG.duration_expression;
    }
    return config;
  },
  icon: "⏱️",
};
