import React from "react";
import {
  WidgetLayout,
  WidgetModel as AppWidgetModel,
} from "../dashboard/Dashboard";

export interface WidgetProps<TConfig = any> {
  id: string;
  config: TConfig;
  onRemove: (id: string) => void;
  onConfigChange?: (newConfig: TConfig) => void;
  onWidgetConfigure?: () => void;
}

export interface WidgetConfigComponentProps<TConfig = any> {
  config: TConfig;
  onConfigChange: (newConfig: TConfig) => void;
}

export interface WidgetDefinition<TConfig = any, TLoadedConfig = any> {
  type: string;
  displayName: string;
  component: React.ComponentType<WidgetProps<TConfig>>;
  defaultConfig: TConfig;
  defaultLayout: { w: number; h: number };

  sanitizeConfig: (
    loadedConfig: Partial<TLoadedConfig> | undefined,
    widgetId: string,
    currentDashboardTitle: string,
  ) => TConfig;
  icon?: React.ReactNode;

  configComponent?: React.ComponentType<WidgetConfigComponentProps<TConfig>>;
  getSpecificProps?: (
    widgetModel: AppWidgetModel,
    dashboardModel?: DashboardModel,
  ) => Record<string, any>;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition<any, any>> = {};

export function registerWidget<TConfig, TLoadedConfig = any>(
  definition: WidgetDefinition<TConfig, TLoadedConfig>,
) {
  if (WIDGET_REGISTRY[definition.type]) {
    console.warn(
      `Widget type "${definition.type}" is already registered. Overwriting.`,
    );
  }
  WIDGET_REGISTRY[definition.type] = definition;
  console.log(`Widget type "${definition.type}" registered.`);
}
