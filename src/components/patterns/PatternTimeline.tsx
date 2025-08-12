// src/components/patterns/PatternTimeline.tsx
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";

import { patternsApi } from "../../api/patternsApi";

interface PatternTimelineProps {
  onEventClick: (patternLabel: string) => void;
}

export const PatternTimeline: React.FC<PatternTimelineProps> = ({
  onEventClick,
}) => {
  const handleEventClick = (clickInfo: EventClickArg) => {
    const patternLabel = clickInfo.event.extendedProps.patternLabel;
    if (patternLabel) {
      onEventClick(patternLabel);
    }
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      }}
      initialView="timeGridWeek"
      events={(fetchInfo, successCallback, failureCallback) => {
        patternsApi
          .getOccurrences(fetchInfo.startStr, fetchInfo.endStr)
          .then((events) => {
            successCallback(events);
          })
          .catch((err) => {
            console.error("Error fetching occurrences:", err);
            failureCallback(err);
          });
      }}
      eventClick={handleEventClick}
      nowIndicator={true}
      editable={false} // Users can't drag events
      selectable={false}
    />
  );
};
