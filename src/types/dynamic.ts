export type FieldType =
  | "string"
  | "integer"
  | "decimal"
  | "boolean"
  | "timestamp"
  | "timelength"
  | "timerange"
  | "list"
  | "dict"
  | "code"
  | "enum";

export interface DynamicExpressionHistory {
  timestamp: string;
  value: any;
}

export interface DynamicFieldInfo {
  original: string;
  value: any;
  type?: FieldType;
}

export interface DynamicExpressionInfo {
  original: string;
  value: any;
  is_dynamic: boolean;
  history: DynamicExpressionHistory[];
}

export interface DynamicExpressionsData {
  [componentType: string]: {
    [componentLabel: string]: {
      [attribute: string]: DynamicExpressionInfo;
    };
  };
}

// Helper type for components that support multiple dynamic fields
export type DynamicFields = Record<string, DynamicFieldInfo>;

export interface FieldUpdateResponse {
  key: string;
  field: string;
  value: any;
  type: FieldType;
  is_dynamic: boolean;
  original: string | null;
  evaluated_value?: string;
}
