// src/types/entities.ts (ensure this is up-to-date from previous steps)
import { FieldType } from "./dynamic";

export interface SerializedTypedValue {
  value: any;
  type: FieldType;
  is_dynamic: boolean;
  original?: string | null;
  enum_choices?: any[] | null;
  item_type?: FieldType | null;
}

export interface Entity {
  name: string;
  entity_type: string;
  category: string;
  attributes: {
    [attributeKey: string]: SerializedTypedValue;
  };
}

export interface AttributeSchemaDetail {
  name: string;
  type: FieldType;
  label: string;
  default_value?: any;
  enum_choices?: any[] | null;
  item_type?: FieldType | null;
  required?: boolean;
  description?: string;
}

export interface EntityTypeDetail {
  name: string;
  displayName: string;
  attributes: {
    [attributeKey: string]: AttributeSchemaDetail;
  };
}

export type EntityTypeDetailList = EntityTypeDetail[];
export type EntityList = Entity[];

export interface CreateEntityPayload {
  name: string;
  entity_type: string;
  category?: string; // Should be present
  attributes_raw: {
    [attributeKey: string]: any;
  };
}

export interface UpdateAttributePayload {
  value: any;
  is_dynamic?: boolean;
  original?: string | null;
}

export interface EntityAttributeUpdateResponse extends SerializedTypedValue {
  entity_name: string;
  entity_type: string;
  attribute_name: string;
  category: string;
}
