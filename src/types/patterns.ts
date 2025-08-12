// src/types/patterns.ts
export interface Pattern {
  label: string;
  name?: string;
  every: string;
  at?: (string | (string | number)[])[];
  between?: [string, string];
  on?: string[];
  except_between?: [string, string];
  groups?: string[];
}

export interface PatternOccurrenceEvent {
  title: string;
  start: string; // ISO String
  allDay: boolean;
  extendedProps: {
    patternLabel: string;
  };
}
