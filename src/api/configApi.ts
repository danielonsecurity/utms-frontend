import { FieldUpdateResponse } from "../types/dynamic";
import { ConfigData, Config, FieldType } from "../types/config";

// Define options interfaces to avoid inline object types
interface ConfigFieldOptions {
  is_dynamic?: boolean;
  original?: string;
  enum_choices?: any[];
}

interface CreateConfigOptions {
  is_dynamic?: boolean;
  original?: string;
  enum_choices?: any[];
}

export const configApi = {
  getConfig: async (signal?: AbortSignal): Promise<ConfigData> => {
    console.log("Fetching config from /api/config");
    const response = await fetch("/api/config", { signal });
    if (!response.ok) throw new Error("Failed to fetch configuration");
    return response.json();
  },

  updateConfigField: async (
    key: string,
    fieldName: string,
    value: any,
    type?: FieldType,
    options?: ConfigFieldOptions,
  ): Promise<FieldUpdateResponse> => {
    const payload = {
      value,
      type,
      ...(options?.is_dynamic !== undefined && {
        is_dynamic: options.is_dynamic,
      }),
      ...(options?.original !== undefined && { original: options.original }),
      ...(options?.enum_choices !== undefined && {
        enum_choices: options.enum_choices,
      }),
    };

    const response = await fetch(`/api/config/${key}/fields/${fieldName}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update config field: ${errorText}`);
    }

    return response.json();
  },

  evaluateFieldExpression: async (
    key: string,
    fieldName: string,
    expression: string,
  ): Promise<FieldUpdateResponse> => {
    const response = await fetch(
      `/api/config/${key}/fields/${fieldName}/evaluate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expression),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to evaluate expression: ${errorText}`);
    }

    return response.json();
  },

  renameConfigKey: async (oldKey: string, newKey: string): Promise<void> => {
    const requestBody = { old_key: oldKey, new_key: newKey };
    console.log("Sending rename request:", requestBody);

    const response = await fetch("/api/config/rename", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Rename error response:", errorData);
      throw new Error(
        `Failed to rename config key: ${JSON.stringify(errorData)}`,
      );
    }
  },

  deleteConfig: async (key: string): Promise<void> => {
    const response = await fetch(`/api/config/${key}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete config: ${errorText}`);
    }
  },

  createConfig: async (
    key: string,
    value: any,
    type?: FieldType,
    options?: CreateConfigOptions,
  ): Promise<void> => {
    const payload = {
      key,
      value,
      ...(type && { type }),
      ...(options?.is_dynamic !== undefined && {
        is_dynamic: options.is_dynamic,
      }),
      ...(options?.original !== undefined && { original: options.original }),
      ...(options?.enum_choices !== undefined && {
        enum_choices: options.enum_choices,
      }),
    };

    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create config: ${errorText}`);
    }
  },
};
