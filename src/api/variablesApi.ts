import { FieldUpdateResponse, DynamicFields } from "../types/dynamic";
import { VariablesData, Variable } from "../types/variables";

export const variablesApi = {
  getVariables: async (signal?: AbortSignal): Promise<VariablesData> => {
    console.log("Fetching variables from /api/variables");
    const response = await fetch("/api/variables", { signal });
    if (!response.ok) throw new Error("Failed to fetch variables");
    return response.json();
  },

  updateVariableField: async (
    key: string,
    fieldName: string,
    value: any,
  ): Promise<FieldUpdateResponse> => {
    const response = await fetch(`/api/variables/${key}/fields/${fieldName}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update variable field: ${errorText}`);
    }

    return response.json();
  },

  evaluateFieldExpression: async (
    key: string,
    fieldName: string,
    expression: string,
  ): Promise<FieldUpdateResponse> => {
    const response = await fetch(
      `/api/variables/${key}/fields/${fieldName}/evaluate`,
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

  renameVariable: async (oldKey: string, newKey: string): Promise<void> => {
    const requestBody = { old_key: oldKey, new_key: newKey };
    console.log("Sending rename request:", requestBody);

    const response = await fetch("/api/variables/rename", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Rename error response:", errorData);
      throw new Error(
        `Failed to rename variable key: ${JSON.stringify(errorData)}`,
      );
    }
  },

  deleteVariable: async (key: string): Promise<void> => {
    const response = await fetch(`/api/variables/${key}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete variable: ${errorText}`);
    }
  },

  createVariable: async (
    key: string,
    fields: Record<string, any>,
    dynamicFields: DynamicFields = {},
  ): Promise<void> => {
    const response = await fetch("/api/variables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        fields,
        dynamic_fields: dynamicFields,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create variable: ${errorText}`);
    }
  },
};
