import { FocusStreamWidget, FocusStreamConfig } from "./FocusStreamWidget";
import { WidgetDefinition } from "../../widgets/registry";
import { FocusStreamWidgetConfigEditor } from "./FocusStreamWidgetConfigEditor";

const DEFAULT_FOCUS_STREAM_CONFIG: Omit<FocusStreamConfig, "hierarchy"> & {
  hierarchy?: string[];
} = {
  // Temporarily allow hierarchy for old configs
  name: "Focus Stream",
  entryTypes: [
    { name: "Domain", color: "#9C27B0", icon: "🎯", canHaveChildren: true },
    { name: "Goal", color: "#3F51B5", icon: "🎪", canHaveChildren: true },
    { name: "Project", color: "#009688", icon: "📁", canHaveChildren: true },
    { name: "Task", color: "#FF9800", icon: "✓", canHaveChildren: true }, // Changed Task default to canHaveChildren: true
    { name: "Habit", color: "#4CAF50", icon: "🔄", canHaveChildren: true }, // Changed Habit default to canHaveChildren: true
    { name: "Note", color: "#607D8B", icon: "📝", canHaveChildren: true }, // Changed Note default to canHaveChildren: true
  ],
  // hierarchy: ["Domain", "Goal", "Project", "Task"], // Removed
  entries: [],
  showCompleted: true,
};

export const focusStreamWidgetDefinition: WidgetDefinition<
  FocusStreamConfig,
  Partial<FocusStreamConfig>
> = {
  type: "focusstream",
  displayName: "Focus Stream",
  component: FocusStreamWidget,
  defaultConfig: (() => {
    const { hierarchy, ...rest } = DEFAULT_FOCUS_STREAM_CONFIG; // Ensure default config doesn't have hierarchy
    return rest as FocusStreamConfig;
  })(),
  defaultLayout: { w: 6, h: 8 },
  configComponent: FocusStreamWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentDashboardTitle) => {
    const idNumPart = widgetId.match(/widget-(\d+)/)?.[1];
    const defaultInstanceName = `Focus Stream ${idNumPart || widgetId.substring(widgetId.length - 3)}`;

    // Destructure to explicitly ignore 'hierarchy' from loadedConfig
    const { hierarchy, ...restOfLoadedConfig } = loadedConfig || {};

    // Base default config without hierarchy
    const { hierarchy: _defaultHierarchy, ...baseDefaultConfig } =
      DEFAULT_FOCUS_STREAM_CONFIG;

    const config: FocusStreamConfig = {
      ...baseDefaultConfig, // Use base default that definitely has no hierarchy field
      ...restOfLoadedConfig, // Spread loaded config (which also has hierarchy removed)
    };

    if (!config.name || config.name === DEFAULT_FOCUS_STREAM_CONFIG.name) {
      config.name =
        restOfLoadedConfig?.name ||
        currentDashboardTitle ||
        defaultInstanceName;
    }

    // Ensure arrays exist
    if (!Array.isArray(config.entryTypes)) {
      config.entryTypes = baseDefaultConfig.entryTypes;
    }
    // if (!Array.isArray(config.hierarchy)) { // Removed
    //   config.hierarchy = baseDefaultConfig.hierarchy;
    // }
    if (!Array.isArray(config.entries)) {
      config.entries = []; // Default to empty array if not present
    }

    // Validate entry types
    config.entryTypes = config.entryTypes.map((type) => ({
      name: String(type.name || "Unknown").trim(),
      color: String(type.color || "#666666"),
      icon: String(type.icon || "•"),
      canHaveChildren:
        typeof type.canHaveChildren === "boolean" ? type.canHaveChildren : true,
    }));

    // Validate entries
    config.entries = config.entries.map((entry) => ({
      id:
        entry.id ||
        `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: String(entry.title || ""),
      type:
        entry.type ||
        config.entryTypes[0]?.name ||
        (config.entryTypes.length > 0 ? config.entryTypes[0].name : "Task"),
      parentId: entry.parentId || null,
      completed: typeof entry.completed === "boolean" ? entry.completed : false,
      collapsed: typeof entry.collapsed === "boolean" ? entry.collapsed : false,
      createdAt:
        typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
      notes: entry.notes || undefined,
    }));

    // Ensure no duplicate entry type names
    const uniqueEntryTypes: EntryType[] = [];
    const names = new Set<string>();
    config.entryTypes.forEach((et) => {
      let newName = et.name;
      let counter = 1;
      while (names.has(newName.toLowerCase())) {
        newName = `${et.name} (${counter++})`;
      }
      names.add(newName.toLowerCase());
      uniqueEntryTypes.push({ ...et, name: newName });
    });
    config.entryTypes = uniqueEntryTypes;

    return config; // This will be of type FocusStreamConfig (which has no hierarchy)
  },
  icon: "🎯",
};
