import { TimerWidget, TimerConfig } from "./TimerWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { TimerWidgetConfigEditor } from "./TimerWidgetConfigEditor";

const DEFAULT_TIMER_CONFIG: TimerConfig = {
  name: "New Timer",
  duration_expression: "5m",
  duration_seconds: 300,
  auto_start: false,
  sound_enabled: true,
  notification_enabled: true,
  on_end_time_hook: `(quote (do (shell "notify-send 'Timer Finished' 'Your timer has expired.'") (shell "paplay ~/utms/frontend/public/sounds/alarm.wav")))`,
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
    const defaultInstanceName = `Timer ${widgetId.match(/widget-(\d+)/)?.[1] || widgetId.substring(widgetId.length - 3)}`;

    // Create a base config, ensuring defaults are applied.
    const config = {
      ...DEFAULT_TIMER_CONFIG,
      ...(loadedConfig || {}),
    };

    // Sanitize boolean values
    config.auto_start =
      typeof config.auto_start === "boolean"
        ? config.auto_start
        : DEFAULT_TIMER_CONFIG.auto_start;
    config.sound_enabled =
      typeof config.sound_enabled === "boolean"
        ? config.sound_enabled
        : DEFAULT_TIMER_CONFIG.sound_enabled;
    config.notification_enabled =
      typeof config.notification_enabled === "boolean"
        ? config.notification_enabled
        : DEFAULT_TIMER_CONFIG.notification_enabled;

    // Sanitize name
    if (!config.name || config.name === "New Timer") {
      config.name =
        loadedConfig?.name || currentDashboardTitle || defaultInstanceName;
    }

    // Sanitize duration values
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

  getInitialCreationPayload: (config) => {
    // This function returns the object that will be sent as `attributes_raw`
    return {
      name: config.name,
      duration_expression: config.duration_expression,
      auto_start: config.auto_start,
      sound_enabled: config.sound_enabled,
      notification_enabled: config.notification_enabled,
      on_end_time_hook: config.on_end_time_hook,
    };
  },
};
