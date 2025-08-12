import React from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import { CalendarWidgetConfig } from "../../../types/calendar";
import { calendarApi } from "../../../api/calendarApi";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export const CalendarWidget: React.FC<WidgetProps<CalendarWidgetConfig>> = ({
  id,
  config,
  onRemove,
  onWidgetConfigure,
}) => {
  if (!config.sources || config.sources.length === 0) {
    return (
      <BaseWidget
        id={id}
        title={config.widgetTitle}
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>This calendar has no sources configured.</p>
          <button onClick={onWidgetConfigure}>Configure Now</button>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      id={id}
      title={config.widgetTitle}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div style={{ padding: "10px", height: "calc(100% - 40px)" }}>
        {" "}
        {/* Adjust height to fit inside BaseWidget */}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          initialView="timeGridWeek"
          height="100%"
          events={(fetchInfo, successCallback, failureCallback) => {
            calendarApi
              .getEvents(
                fetchInfo.start.toISOString(),
                fetchInfo.end.toISOString(),
                config.sources,
              )
              .then((events) => successCallback(events))
              .catch((err) => failureCallback(err));
          }}
          nowIndicator={true}
        />
      </div>
    </BaseWidget>
  );
};
