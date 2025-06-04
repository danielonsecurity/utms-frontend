import {
  EntityTypeDetailList,
  EntityList,
  Entity as EntityInstance,
  CreateEntityPayload, // This payload will now include an optional category
  UpdateAttributePayload, // This is for a single attribute, category is implicit via entity lookup
  EntityAttributeUpdateResponse,
  EntityTypeDetail, // For return type of a single type detail if needed
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
  // --- Entity Type Schema ---
  getEntityTypes: async (
    signal?: AbortSignal,
  ): Promise<EntityTypeDetailList> => {
    return fetchApi<EntityTypeDetailList>(`${API_BASE_URL}/entities/types`, {
      signal,
    });
  },

  // --- Entity Instances ---
  getEntities: async (
    entityType?: string,
    category?: string, // New optional category filter
    signal?: AbortSignal,
  ): Promise<EntityList> => {
    const params = new URLSearchParams();
    if (entityType) params.append("entity_type", entityType);
    if (category) params.append("category", category);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/entities${queryString ? `?${queryString}` : ""}`;
    return fetchApi<EntityList>(url, { signal });
  },

  getEntity: async (
    entityType: string,
    name: string,
    // category?: string, // Add if names are not unique across categories for a type
    signal?: AbortSignal,
  ): Promise<EntityInstance> => {
    // Assuming name is unique per type for now for GET single
    return fetchApi<EntityInstance>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(name)}`,
      { signal },
    );
  },

  createEntity: async (
    payload: CreateEntityPayload,
  ): Promise<EntityInstance> => {
    // CreateEntityPayload should now include an optional 'category' field.
    // The backend route uses Body(embed=True) for individual fields.
    // So, the payload object itself is NOT embedded, but its fields are expected at top level of an outer object.
    // The backend route is: name: str = Body(..., embed=True), entity_type: str = Body(..., embed=True), etc.
    // This means the frontend should send:
    // {
    //   "name": payload.name,
    //   "entity_type": payload.entity_type,
    //   "category": payload.category || "default",
    //   "attributes_raw": payload.attributes_raw
    // }
    // However, if backend route for POST /api/entities takes a single Pydantic model `CreateEntityPayload` as the body,
    // then just sending `payload` is correct.
    // Your current backend POST route expects embedded fields.
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
    entityType: string,
    name: string,
    attributeName: string,
    payload: UpdateAttributePayload,
  ): Promise<EntityAttributeUpdateResponse> => {
    const apiUrl = `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(name)}/attributes/${encodeURIComponent(attributeName)}`;
    console.log(
      `[entitiesApi.updateEntityAttribute] Sending to ${apiUrl} - Payload:`,
      JSON.parse(JSON.stringify(payload)),
    );
    return fetchApi<EntityAttributeUpdateResponse>(apiUrl, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteEntity: async (entityType: string, name: string): Promise<void> => {
    await fetchApi<void>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  },

  renameEntity: async (
    entityType: string,
    name: string,
    newName: string,
  ): Promise<any> => {
    return fetchApi<any>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(name)}/rename`,
      { method: "PUT", body: JSON.stringify({ new_name: newName }) },
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

  // --- New Category Management API calls ---
  getCategoriesForEntityType: async (
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
    entityName: string,
    newCategory: string,
  ): Promise<any> => {
    return fetchApi<any>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(entityName)}/category`,
      { method: "PUT", body: JSON.stringify({ new_category: newCategory }) }, // embed=True on backend
    );
  },
};
