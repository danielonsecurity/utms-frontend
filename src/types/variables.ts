import { DynamicFields, FieldUpdateResponse } from "./dynamic";

export interface SerializedTypedValue {
  type: string; // FieldType as string, e.g., "integer", "string", "datetime"
  value: any; // The actual resolved and serialized value
  item_type?: string | null;
  is_dynamic: boolean;
  original?: string | null;
  enum_choices?: any[] | null;
  item_schema_type?: string | null;
  referenced_entity_type?: string | null;
  referenced_entity_category?: string | null;
}

export interface VariableApiResponse {
  key: string;
  value: SerializedTypedValue;
}

export interface Variable {
  key: string;
  value: any; // The actual resolved value from SerializedTypedValue.value
  type: string; // The FieldType string from SerializedTypedValue.type
  is_dynamic: boolean; // From SerializedTypedValue.is_dynamic
  original?: string | null; // From SerializedTypedValue.original
  item_type?: string | null; // From SerializedTypedValue.item_type
}

export interface VariableUpdatePayload {
  value: any; // The raw value (can be string for Hy expression or Python native)
  is_dynamic: boolean;
  original_expression?: string | null; // The Hy expression string if is_dynamic is true
  field_type?: string | null; // Optional: hint for the backend TypedValue's FieldType
}

export type VariablesData = Record<string, Variable>;

export interface VariablesState {
  variables: VariablesData;
  isLoading: boolean;
  error: Error | null;
}
