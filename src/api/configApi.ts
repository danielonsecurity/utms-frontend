import { ConfigData, ConfigValue } from "../types/config";

export const configApi = {
  getConfig: async (signal?: AbortSignal): Promise<ConfigData> => {
    console.log("Fetching config from /api/config");
    const response = await fetch("/api/config", { signal });
    if (!response.ok) throw new Error("Failed to fetch configuration");
    return response.json();
  },

  updateConfig: async (
    key: string,
    value: string | number | string[],
  ): Promise<ConfigValue> => {
    const response = await fetch(`/api/config/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update configuration: ${errorText}`);
    }

    return response.json();
  },

  evaluateExpression: async (
    key: string,
    expression: string,
  ): Promise<ConfigValue> => {
    const response = await fetch(`/api/config/${key}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expression),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to evaluate expression: ${errorText}`);
    }

    return response.json();
  },

  renameConfigKey: async (oldKey: string, newKey: string): Promise<void> => {
    const response = await fetch("/api/config/rename", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_key: oldKey, new_key: newKey }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to rename config key: ${errorText}`);
    }
  },

  updateListItem: async (
    key: string,
    index: number,
    value: string,
  ): Promise<void> => {
    const response = await fetch(`/api/config/${key}/${index}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!response.ok) throw new Error("Failed to update list item");
  },

  addNewListItem: async (key: string): Promise<void> => {
    const response = await fetch(`/api/config/${key}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(""),
    });
    if (!response.ok) throw new Error("Failed to add list item");
  },
};
