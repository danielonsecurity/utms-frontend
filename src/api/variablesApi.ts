import { FieldUpdateResponse, DynamicFields } from "../types/dynamic"; // Adjust path as needed
import {
  VariablesData,
  Variable,
  VariableApiResponse,
  SerializedTypedValue,
  VariableUpdatePayload, // Import the new payload type
} from "../types/variables";

export const variablesApi = {
  getVariables: async (signal?: AbortSignal): Promise<VariablesData> => {
    console.log("Fetching variables from /api/variables");
    const response = await fetch("/api/variables", { signal });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch variables:", errorText);
      throw new Error(
        `Failed to fetch variables: ${response.status} ${response.statusText}`,
      );
    }

    const apiResponseData: { [key: string]: VariableApiResponse } =
      await response.json();
    const processedVariables: VariablesData = {};

    for (const key in apiResponseData) {
      if (Object.prototype.hasOwnProperty.call(apiResponseData, key)) {
        const apiVariable: VariableApiResponse = apiResponseData[key];
        const serializedTypedVal: SerializedTypedValue = apiVariable.value;

        processedVariables[key] = {
          key: apiVariable.key,
          value: serializedTypedVal.value,
          type: serializedTypedVal.type,
          item_type: serializedTypedVal.item_type,
          is_dynamic: serializedTypedVal.is_dynamic,
          original: serializedTypedVal.original,
        };
      }
    }
    console.log("Processed variables:", processedVariables);
    return processedVariables;
  },

  evaluateVariableExpression: async (
    variableKeyContext: string, // Key of the variable for context (backend uses it as label)
    expressionToEvaluate: string, // The Hy expression string
  ): Promise<SerializedTypedValue> => {
    // Backend returns a SerializedTypedValue
    const response = await fetch(
      `/api/variables/${variableKeyContext}/evaluate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: expressionToEvaluate }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to evaluate expression for variable context ${variableKeyContext}: ${errorText}`,
      );
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
      let errorDetails = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData.detail || errorData);
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error("Rename error response:", errorDetails);
      throw new Error(`Failed to rename variable key: ${errorDetails}`);
    }
    // Expecting 200 OK with JSON success message from backend for this one based on backend code.
    // const successData = await response.json();
    // console.log("Rename success:", successData);
    // return; // Or handle successData if needed
  },

  deleteVariable: async (key: string): Promise<void> => {
    const response = await fetch(`/api/variables/${key}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete variable ${key}: ${errorText}`);
    }
  },

  // Aligns with backend POST /api/variables/{key}
  createVariable: async (
    key: string,
    payload: VariableUpdatePayload, // Use the defined payload type
  ): Promise<VariableApiResponse> => {
    const response = await fetch(`/api/variables/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create variable ${key}: ${errorText}`);
    }
    return response.json(); // Backend returns the created VariableApiResponse
  },

  // Aligns with backend PUT /api/variables/{key}
  updateVariable: async (
    key: string,
    payload: VariableUpdatePayload, // Use the defined payload type
  ): Promise<VariableApiResponse> => {
    const response = await fetch(`/api/variables/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update variable ${key}: ${errorText}`);
    }
    return response.json(); // Returns the updated VariableApiResponse
  },
};
