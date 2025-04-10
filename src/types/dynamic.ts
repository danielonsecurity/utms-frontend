export interface DynamicExpressionHistory {
  timestamp: string;
  value: any;
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
