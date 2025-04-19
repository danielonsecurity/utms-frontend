export interface DynamicValue {
  key: string;
  is_dynamic: boolean;
  value: any;
  original: string | null;
}
