// src/types/calendar.ts

// Defines what a user can select to show on the calendar
export interface CalendarSource {
  id: string; // e.g., "task:default:recurrence"
  entityType: string;
  category: string;
}

// Configuration for the widget itself
export interface CalendarWidgetConfig {
  widgetTitle: string;
  sources: CalendarSource[];
}

// Event object for FullCalendar
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO String
  end?: string;
  allDay: boolean;
  color?: string;
  extendedProps: {
    entityId: string;
    attribute: string;
  };
}
