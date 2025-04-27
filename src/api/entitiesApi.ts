import axios from "axios";

const API_URL = "/api";

export const entitiesApi = {
  // Get all entity types
  getEntityTypes: async () => {
    const response = await axios.get(`${API_URL}/entities/types`);
    return response.data;
  },

  // Get all entities or entities of a specific type
  getEntities: async (entityType?: string) => {
    const url = entityType
      ? `${API_URL}/entities?entity_type=${entityType}`
      : `${API_URL}/entities`;
    const response = await axios.get(url);
    return response.data;
  },

  // Get a specific entity
  getEntity: async (entityType: string, name: string) => {
    const response = await axios.get(
      `${API_URL}/entities/${entityType}/${name}`,
    );
    return response.data;
  },

  // Create a new entity
  createEntity: async (entityData: any) => {
    const response = await axios.post(`${API_URL}/entities`, entityData);
    return response.data;
  },

  // Update an entity attribute
  updateEntityAttribute: async (
    entityType: string,
    name: string,
    attributeName: string,
    value: any,
    isDynamic: boolean = false,
    original?: string,
  ) => {
    const response = await axios.put(
      `${API_URL}/entities/${entityType}/${name}/attributes/${attributeName}`,
      { value, is_dynamic: isDynamic, original },
    );
    return response.data;
  },

  // Delete an entity
  deleteEntity: async (entityType: string, name: string) => {
    const response = await axios.delete(
      `${API_URL}/entities/${entityType}/${name}`,
    );
    return response.data;
  },

  // Rename an entity
  renameEntity: async (entityType: string, name: string, newName: string) => {
    const response = await axios.put(
      `${API_URL}/entities/${entityType}/${name}/rename`,
      { new_name: newName },
    );
    return response.data;
  },

  // Evaluate an expression for an entity attribute
  evaluateExpression: async (
    entityType: string,
    name: string,
    attributeName: string,
    expression: string,
  ) => {
    const response = await axios.post(
      `${API_URL}/entities/${entityType}/${name}/attributes/${attributeName}/evaluate`,
      { expression },
    );
    return response.data;
  },
};
