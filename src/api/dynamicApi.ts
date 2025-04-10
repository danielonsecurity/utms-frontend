import {
  DynamicExpressionsData,
  DynamicExpressionInfo,
} from "../types/dynamic";

export const dynamicApi = {
  getExpressions: async (
    params?: {
      component_type?: string;
      component_label?: string;
      attribute?: string;
    },
    signal?: AbortSignal,
  ): Promise<DynamicExpressionsData> => {
    const queryParams = new URLSearchParams();
    if (params?.component_type) {
      queryParams.append("component_type", params.component_type);
    }
    if (params?.component_label) {
      queryParams.append("component_label", params.component_label);
    }
    if (params?.attribute) {
      queryParams.append("attribute", params.attribute);
    }

    const url = `/api/dynamic/expressions${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, { signal });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch dynamic expressions: ${errorText}`);
    }
    return response.json();
  },

  evaluate: async (
    componentType: string,
    componentLabel: string,
    attribute?: string,
    context?: Record<string, any>,
  ): Promise<Record<string, any>> => {
    const response = await fetch("/api/dynamic/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component_type: componentType,
        component_label: componentLabel,
        attribute,
        context,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to evaluate expression: ${errorText}`);
    }
    return response.json();
  },

  evaluateAll: async (params?: {
    component_type?: string;
    component_label?: string;
    context?: Record<string, any>;
  }): Promise<Record<string, any>> => {
    const response = await fetch("/api/dynamic/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to evaluate expressions: ${errorText}`);
    }
    return response.json();
  },

  clearHistory: async (params?: {
    component_type?: string;
    component_label?: string;
    attribute?: string;
    before?: string; // ISO date string
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.component_type) {
      queryParams.append("component_type", params.component_type);
    }
    if (params?.component_label) {
      queryParams.append("component_label", params.component_label);
    }
    if (params?.attribute) {
      queryParams.append("attribute", params.attribute);
    }
    if (params?.before) {
      queryParams.append("before", params.before);
    }

    const url = `/api/dynamic/history${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to clear history: ${errorText}`);
    }
  },

  getDynamicInfo: async (
    componentType: string,
    componentLabel: string,
    attribute: string,
    signal?: AbortSignal,
  ): Promise<DynamicExpressionInfo> => {
    const response = await fetch(
      `/api/dynamic/expressions/${componentType}/${componentLabel}/${attribute}`,
      { signal },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch dynamic expression info: ${errorText}`);
    }
    return response.json();
  },

  refreshExpression: async (
    componentType: string,
    componentLabel: string,
    attribute: string,
  ): Promise<DynamicExpressionInfo> => {
    const response = await fetch(
      `/api/dynamic/expressions/${componentType}/${componentLabel}/${attribute}/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh expression: ${errorText}`);
    }
    return response.json();
  },
};
