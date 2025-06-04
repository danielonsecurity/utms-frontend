export interface EventDate {
  date: string; // YYYY, YYYY-MM, YYYY-MM-DD
  precision: "year" | "month" | "day" | "estimated";
  estimateRange?: { start: string; end: string }; // For 'estimated' precision
}

export interface TimelineEvent {
  id: string;
  lifelineId?: string; // If attached to a specific person
  title: string;
  type: "point" | "duration" | "recurring"; // Added 'recurring' for future
  startDate: EventDate;
  endDate?: EventDate; // For duration events
  description?: string;
  color?: string;
  tags?: string[];
  // For recurring events:
  // recurringPattern?: RecurringEventPattern;
}

export interface Lifeline {
  id: string; // Will be derived from person's name
  name: string;
  birthDate: EventDate;
  deathDate?: EventDate;
  color: string;
  // Potentially other attributes derived from person data
}

export interface HistoricalPeriod {
  id: string;
  name: string;
  startDate: EventDate;
  endDate: EventDate;
  color: string;
  description?: string;
}

// --- Backend Data Structures ---
export interface BackendAttribute {
  type: string;
  value: string | null;
  is_dynamic?: boolean;
  original?: string;
}

export interface BackendPersonEntity {
  name: string;
  entity_type: "person";
  category?: string; // e.g., "default"
  attributes: {
    birth: BackendAttribute;
    death: BackendAttribute;
    // You can add more expected attributes here if they become relevant
    // e.g., 'place_of_birth'?: BackendAttribute;
  };
}

// --- Widget Configuration ---
export interface GenerationalHistoricalWidgetConfig {
  name: string;
  showHistoricalPeriods: boolean;
}
