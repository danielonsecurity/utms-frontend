import { DynamicFields, FieldUpdateResponse, FieldType } from "./dynamic";

export interface Config {
  key: string;
  value: any;
  type: string;
  is_dynamic: boolean;
  original?: string | null;
  enum_choices?: any[];
}

export type ConfigData = Record<string, Config>;

export interface ConfigState {
  config: ConfigData;
  isLoading: boolean;
  error: Error | null;
}

export interface ConfigChoices {
  [key: string]: string[];
}

// Helper for creating typed values
export function createTypedValue(
  value: any,
  type: FieldType = "string",
  options: {
    is_dynamic?: boolean;
    original?: string;
    enum_choices?: any[];
    item_type?: FieldType;
  } = {},
): TypedValue {
  return {
    value,
    type,
    is_dynamic: options.is_dynamic || false,
    original: options.original || null,
    enum_choices: options.enum_choices,
    item_type: options.item_type,
  };
}
