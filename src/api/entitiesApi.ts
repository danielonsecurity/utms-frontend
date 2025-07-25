import {
  EntityTypeDetailList,
  EntityList,
  Entity as EntityInstance,
  CreateEntityPayload, // This payload will now include an optional category
  UpdateAttributePayload, // This is for a single attribute, category is implicit via entity lookup
  EntityAttributeUpdateResponse,
} from "../types/entities"; // Make sure these types are defined as discussed

const API_BASE_URL = "/api";

// fetchApi helper function (from response #17 - ensure it's here and correct)
async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers: defaultHeaders });
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = await response.text();
    }
    const errorMessage =
      errorData?.detail ||
      (typeof errorData === "string" ? errorData : response.statusText) ||
      "API request failed";
    console.error("API Error:", response.status, errorMessage, errorData);
    throw new Error(errorMessage);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const entitiesApi = {
  getEntityTypes: async (
    signal?: AbortSignal,
  ): Promise<EntityTypeDetailList> => {
    return fetchApi<EntityTypeDetailList>(`${API_BASE_URL}/entities/types`, {
      signal,
    });
  },

  getEntities: async (
    entityType?: string,
    category?: string,
    signal?: AbortSignal,
  ): Promise<EntityList> => {
    const params = new URLSearchParams();
    if (entityType) params.append("entity_type", entityType);
    if (category) params.append("category", category);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/entities${queryString ? `?${queryString}` : ""}`;
    return fetchApi<EntityList>(url, { signal });
  },

  getActiveEntities: async (signal?: AbortSignal): Promise<EntityList> => {
    return fetchApi<EntityList>(`${API_BASE_URL}/entities/active`, {
      signal,
    });
  },

  getEntity: async (
    entityType: string,
    category?: string,
    name: string,
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    // Assuming name is unique per type for now for GET single
    return fetchApi<EntityInstance>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(category)}/${encodeURIComponent(name)}`,
      { signal },
    );
  },

  createEntity: async (
    payload: CreateEntityPayload,
  ): Promise<EntityInstance> => {
    const body = {
      name: payload.name,
      entity_type: payload.entity_type,
      category: payload.category || "default", // Ensure default if not provided
      attributes_raw: payload.attributes_raw,
    };
    return fetchApi<EntityInstance>(`${API_BASE_URL}/entities`, {
      method: "POST",
      body: JSON.stringify(body), // Send the structured body
    });
  },

  updateEntityAttribute: async (
    // <<< MODIFIED: Added category parameter
    entityType: string,
    category: string, // <<< NEW
    name: string,
    attributeName: string,
    payload: UpdateAttributePayload,
  ): Promise<EntityAttributeUpdateResponse> => {
    const apiUrl = `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(category)}/${encodeURIComponent(name)}/attributes/${encodeURIComponent(attributeName)}`; // <<< UPDATED URL
    console.log(
      `[entitiesApi.updateEntityAttribute] Sending to ${apiUrl} - Payload:`,
      JSON.parse(JSON.stringify(payload)), // Deep clone for logging
    );
    return fetchApi<EntityAttributeUpdateResponse>(apiUrl, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteEntity: async (
    // <<< MODIFIED: Added category parameter
    entityType: string,
    category: string, // <<< NEW
    name: string,
  ): Promise<void> => {
    await fetchApi<void>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(category)}/${encodeURIComponent(name)}`, // <<< UPDATED URL
      { method: "DELETE" },
    );
  },

  renameEntity: async (
    // <<< MODIFIED: Added oldCategory parameter
    entityType: string,
    oldCategory: string, // <<< NEW
    oldName: string,
    newName: string,
    newCategory?: string, // Optional new category
  ): Promise<any> => {
    // Assuming backend returns a specific success response
    const body: { new_name: string; new_category?: string } = {
      new_name: newName,
    };
    if (newCategory) {
      body.new_category = newCategory;
    }
    return fetchApi<any>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(oldCategory)}/${encodeURIComponent(oldName)}/rename`, // <<< UPDATED URL
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
  },

  evaluateExpression: async (
    // Assuming this is still needed
    entityType: string,
    name: string,
    attributeName: string,
    expression: string,
  ): Promise<EntityAttributeUpdateResponse> => {
    return fetchApi<EntityAttributeUpdateResponse>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(name)}/attributes/${encodeURIComponent(attributeName)}/evaluate`,
      { method: "POST", body: JSON.stringify({ expression: expression }) },
    );
  },

  getCategoriesForEntityType: async (
    // Unchanged
    entityTypeKey: string,
    signal?: AbortSignal,
  ): Promise<string[]> => {
    return fetchApi<string[]>(
      `${API_BASE_URL}/entities/types/${encodeURIComponent(entityTypeKey)}/categories`,
      { signal },
    );
  },

  createEntityCategory: async (
    entityTypeKey: string,
    categoryName: string,
  ): Promise<{ message: string; category_name: string }> => {
    return fetchApi<{ message: string; category_name: string }>(
      `${API_BASE_URL}/entities/types/${encodeURIComponent(entityTypeKey)}/categories`,
      { method: "POST", body: JSON.stringify({ category_name: categoryName }) }, // embed=True on backend
    );
  },

  renameEntityCategory: async (
    entityTypeKey: string,
    oldCategoryName: string,
    newCategoryName: string,
  ): Promise<any> => {
    return fetchApi<any>(
      `${API_BASE_URL}/entities/types/${encodeURIComponent(entityTypeKey)}/categories/${encodeURIComponent(oldCategoryName)}`,
      {
        method: "PUT",
        body: JSON.stringify({ new_category_name: newCategoryName }),
      }, // embed=True on backend
    );
  },

  deleteEntityCategory: async (
    entityTypeKey: string,
    categoryName: string,
    moveEntitiesToDefault: boolean = true,
  ): Promise<void> => {
    const params = new URLSearchParams({
      move_entities_to_default: String(moveEntitiesToDefault),
    });
    await fetchApi<void>(
      `${API_BASE_URL}/entities/types/${encodeURIComponent(entityTypeKey)}/categories/${encodeURIComponent(categoryName)}?${params.toString()}`,
      { method: "DELETE" },
    );
  },

  moveEntityToCategory: async (
    entityType: string,
    entityOldCategory: string,
    entityName: string,
    newCategory: string,
  ): Promise<any> => {
    const oldPathForLookup = `${encodeURIComponent(entityType)}/${encodeURIComponent(entityOldCategory)}/${encodeURIComponent(entityName)}`;

    return fetchApi<any>(
      `${API_BASE_URL}/entities/${oldPathForLookup}/category`,
      { method: "PUT", body: JSON.stringify({ new_category: newCategory }) },
    );
  },

  startOccurrence: async (
    entityType: string,
    category: string,
    name: string,
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(category)}/${encodeURIComponent(name)}/occurrences/start`;
    return fetchApi<EntityInstance>(url, {
      method: "POST",
      signal,
    });
  },

  endOccurrence: async (
    entityType: string,
    category: string,
    name: string,
    payload: { notes?: string; metadata?: Record<string, any> },
  ): Promise<EntityInstance> => {
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(category)}/${encodeURIComponent(name)}/occurrences/end`;
    return fetchApi<EntityInstance>(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  startTimer: async (
    category: string,
    name: string,
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    const url = `${API_BASE_URL}/entities/timer/${encodeURIComponent(category)}/${encodeURIComponent(name)}/start`;
    return fetchApi<EntityInstance>(url, { method: "POST", signal });
  },

  pauseTimer: async (
    category: string,
    name: string,
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    const url = `${API_BASE_URL}/entities/timer/${encodeURIComponent(category)}/${encodeURIComponent(name)}/pause`;
    return fetchApi<EntityInstance>(url, { method: "POST", signal });
  },

  resetTimer: async (
    category: string,
    name: string,
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    const url = `${API_BASE_URL}/entities/timer/${encodeURIComponent(category)}/${encodeURIComponent(name)}/reset`;
    return fetchApi<EntityInstance>(url, { method: "POST", signal });
  },

  getRoutines: async (signal?: AbortSignal): Promise<EntityList> => {
    return entitiesApi.getEntities("routine", undefined, signal);
  },
  executeHyCode: async (code: string): Promise<any> => {
    return fetchApi<any>(`${API_BASE_URL}/execute-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};
