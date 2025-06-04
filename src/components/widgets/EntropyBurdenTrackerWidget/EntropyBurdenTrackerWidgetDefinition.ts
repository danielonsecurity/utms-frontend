// entropyBurdenTracker/EntropyBurdenTrackerWidgetDefinition.ts
import { WidgetDefinition } from "../../../widgets/registry"; // Adjust path
import { EntropyBurdenTrackerWidget } from "./EntropyBurdenTrackerWidget";
import { EntropyBurdenTrackerWidgetConfigEditor } from "./EntropyBurdenTrackerWidgetConfigEditor";
import {
  EntropyBurdenTrackerConfig,
  EntropyBurden,
  BurdenActionLogEntry,
} from "./types";

const DEFAULT_ENTROPY_BURDENS: EntropyBurden[] = [
  {
    id: crypto.randomUUID(),
    name: "Organize Digital Photos",
    description:
      "Years of photos dumped into one folder, needs sorting and backup.",
    currentEntropyLevel: 0.8,
    energyToEngage: "Medium",
    emotionalLoad: "😟",
    importance: "Medium",
    decayRate: "Slow",
    tags: ["digital", "memories", "backup"],
    log: [],
    creationTimestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(), // ~30 days ago
    lastTouchedTimestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 10,
    ).toISOString(), // ~10 days ago
  },
  {
    id: crypto.randomUUID(),
    name: "Inbox Zero (Personal Email)",
    currentEntropyLevel: 0.6,
    energyToEngage: "Low", // Can be done in small chunks
    emotionalLoad: "😐",
    importance: "High",
    decayRate: "Steady",
    tags: ["digital", "communication", "productivity"],
    log: [],
    creationTimestamp: new Date().toISOString(),
  },
];

const DEFAULT_CONFIG: EntropyBurdenTrackerConfig = {
  widgetTitle: "Entropy Burdens",
  burdens: DEFAULT_ENTROPY_BURDENS,
};

export const entropyBurdenTrackerWidgetDefinition: WidgetDefinition<
  EntropyBurdenTrackerConfig,
  Partial<EntropyBurdenTrackerConfig>
> = {
  type: "entropy-burden-tracker",
  displayName: "Entropy Burden Tracker",
  icon: "📉", // or "🌪️" or "📦"
  component: EntropyBurdenTrackerWidget,
  defaultConfig: DEFAULT_CONFIG,
  defaultLayout: { w: 6, h: 8 }, // This widget might need more space
  configComponent: EntropyBurdenTrackerWidgetConfigEditor,
  sanitizeConfig: (loadedConfig, widgetId, currentWidgetTitle) => {
    const defaults = DEFAULT_CONFIG;
    const config = { ...defaults, ...(loadedConfig || {}) };

    config.widgetTitle =
      loadedConfig?.widgetTitle || currentWidgetTitle || defaults.widgetTitle;

    if (!Array.isArray(config.burdens)) {
      config.burdens = defaults.burdens;
    } else {
      config.burdens = config.burdens
        .map((b: any): EntropyBurden => {
          const newB: EntropyBurden = {
            id: b.id || crypto.randomUUID(),
            name:
              typeof b.name === "string" && b.name.trim()
                ? b.name.trim()
                : "Unnamed Burden",
            description:
              typeof b.description === "string" ? b.description : undefined,
            currentEntropyLevel:
              typeof b.currentEntropyLevel === "number" &&
              b.currentEntropyLevel >= 0 &&
              b.currentEntropyLevel <= 1
                ? b.currentEntropyLevel
                : 0.5,
            lastTouchedTimestamp:
              typeof b.lastTouchedTimestamp === "string"
                ? b.lastTouchedTimestamp
                : undefined,
            energyToEngage: b.energyToEngage || "Medium",
            emotionalLoad: b.emotionalLoad || "😐",
            importance: b.importance || "Medium",
            decayRate: b.decayRate || "Steady",
            tags: Array.isArray(b.tags)
              ? b.tags.map(String).filter((t) => t)
              : [],
            log: Array.isArray(b.log)
              ? b.log
                  .map(
                    (l: any): BurdenActionLogEntry => ({
                      // Sanitize log entries
                      id: l.id || crypto.randomUUID(),
                      timestamp:
                        typeof l.timestamp === "string"
                          ? l.timestamp
                          : new Date().toISOString(),
                      entropyChange:
                        typeof l.entropyChange === "number"
                          ? l.entropyChange
                          : 0,
                      notes: typeof l.notes === "string" ? l.notes : undefined,
                      energyExpended: l.energyExpended, // Add further validation if needed
                      moodAfter: l.moodAfter, // Add further validation if needed
                    }),
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime(),
                  )
              : [], // Sort logs by most recent first
            creationTimestamp:
              typeof b.creationTimestamp === "string"
                ? b.creationTimestamp
                : new Date().toISOString(),
          };
          // Ensure lastTouched is consistent if logs exist
          if (
            newB.log.length > 0 &&
            (!newB.lastTouchedTimestamp ||
              new Date(newB.log[0].timestamp).getTime() >
                new Date(newB.lastTouchedTimestamp).getTime())
          ) {
            newB.lastTouchedTimestamp = newB.log[0].timestamp;
          }
          return newB;
        })
        .filter((b) => b.name !== "Unnamed Burden");

      if (
        config.burdens.length === 0 &&
        defaults.burdens.length > 0 &&
        !loadedConfig
      ) {
        // Only restore defaults if it's not an intentional empty state from loaded
        // config.burdens = defaults.burdens; // Or allow empty
      }
    }
    return config;
  },
};
