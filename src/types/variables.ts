import { DynamicFields, FieldUpdateResponse } from "./dynamic";

export interface Variable {
  key: string;
  value: any;
  dynamic_fields: DynamicFields;
}

export type VariablesData = Record<string, Variable>;

export interface VariablesState {
  variables: VariablesData;
  isLoading: boolean;
  error: Error | null;
}
