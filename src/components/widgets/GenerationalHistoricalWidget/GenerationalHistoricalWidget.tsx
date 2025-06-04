// GenerationalHistoricalWidget.tsx

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { BaseWidget } from "../BaseWidget"; // Adjust path as needed
import { WidgetProps } from "../../widgets/registry"; // Adjust path as needed
import { scaleTime, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar } from "@visx/shape";
import { GridRows, GridColumns } from "@visx/grid";
import { Tooltip, useTooltip } from "@visx/tooltip"; // Removed withTooltip as useTooltip is sufficient
import { localPoint } from "@visx/event";
import { timeFormat } from "d3-time-format";
import {
  timeSecond,
  timeMinute,
  timeHour,
  timeDay,
  timeSunday,
  timeMonth,
  timeYear,
} from "d3-time";
import { ParentSize } from "@visx/responsive";

// Import types from the new file
import {
  EventDate,
  TimelineEvent,
  Lifeline,
  HistoricalPeriod,
  BackendPersonEntity,
  GenerationalHistoricalWidgetConfig,
} from "./types"; // Adjust path if necessary

// --- Mock Data (using types from types.ts) ---
const MOCK_EVENTS: TimelineEvent[] = []; // Start with empty, to be fetched later
const MOCK_HISTORICAL_PERIODS: HistoricalPeriod[] = []; // Start with empty

// --- Color Palette for Lifelines ---
const LIFELINE_COLORS = [
  "#4A90E2",
  "#D0021B",
  "#F5A623",
  "#BD10E0",
  "#7ED321",
  "#417505",
  "#B8E986",
  "#F8E71C",
  "#F19A21",
  "#50E3C2",
  "#9013FE",
  "#B4A7D6",
  "#E06666",
  "#FF9900",
  "#93C47D",
  "#00BCD4",
  "#8BC34A",
  "#FFC107",
];

// --- Helper Functions ---
export const eventDateToDate = (
  ed: EventDate,
  position: "start" | "end" = "start",
): Date | null => {
  if (!ed || !ed.date) return null;
  const dateParts = ed.date.split("-");
  const year = parseInt(dateParts[0], 10);

  if (isNaN(year)) return null;

  let month = 0;
  let day = 1;

  if (ed.precision === "month" || ed.precision === "day") {
    if (dateParts.length > 1) month = parseInt(dateParts[1], 10) - 1;
    else if (position === "end") month = 11;
  }
  if (ed.precision === "day") {
    if (dateParts.length > 2) day = parseInt(dateParts[2], 10);
    else if (position === "end") day = new Date(year, month + 1, 0).getDate();
  }

  if (ed.precision === "estimated") {
    if (position === "start" && ed.estimateRange?.start)
      return eventDateToDate(
        { date: ed.estimateRange.start, precision: "day" },
        "start",
      );
    if (position === "end" && ed.estimateRange?.end)
      return eventDateToDate(
        { date: ed.estimateRange.end, precision: "day" },
        "end",
      );
    if (dateParts.length === 1)
      return new Date(
        year,
        position === "start" ? 0 : 11,
        position === "start" ? 1 : 31,
      );
    if (dateParts.length === 2)
      return new Date(
        year,
        month,
        position === "start" ? 1 : new Date(year, month + 1, 0).getDate(),
      );
  }

  if (position === "start") {
    return new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone shifts for date-only data
  } else {
    if (ed.precision === "year")
      return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    if (ed.precision === "month")
      return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }
};

const fmtMs = timeFormat(".%L");
const fmtSec = timeFormat(":%S");
const fmtMin = timeFormat("%H:%M");
const fmtHour = timeFormat("%H:%M");
const fmtDay = timeFormat("%a %d");
const fmtWeek = timeFormat("%b %d");
const fmtMonth = timeFormat("%B");
const fmtYear = timeFormat("%Y");

export function universalTickFormat(date: Date): string {
  const d = new Date(date); // Ensure it's a new Date object for d3-time functions
  if (timeSecond(d) < d) return fmtMs(d);
  if (timeMinute(d) < d) return fmtSec(d);
  if (timeHour(d) < d) return fmtMin(d);
  if (timeDay(d) < d) return fmtHour(d);
  if (timeMonth(d) < d) {
    if (timeSunday(d) < d) return fmtDay(d);
    return fmtWeek(d);
  }
  if (timeYear(d) < d) return fmtMonth(d);
  return fmtYear(d);
}

const ZOOM_BUTTON_FACTOR = 1.5;
const ZOOM_WHEEL_FACTOR = 1.1;
const MIN_VIEW_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
const MAX_VIEW_DURATION_MS = 1000 * 365.25 * 24 * 60 * 60 * 1000; // 1000 years
const defaultMargin = { top: 20, right: 30, bottom: 50, left: 120 };

// --- Display Component (GenerationalHistoricalDisplay) ---
interface GenerationalHistoricalDisplayProps {
  width: number;
  height: number;
  config: GenerationalHistoricalWidgetConfig;
  lifelinesData: Lifeline[];
  eventsData: TimelineEvent[];
  historicalPeriodsData: HistoricalPeriod[];
  viewRange: { start: Date; end: Date };
  setViewRange: (newRange: { start: Date; end: Date }) => void;
  initialViewDurationMs: number;
  translateX: number;
  onTaskClick?: (item: TimelineEvent | Lifeline | HistoricalPeriod) => void;
  showTooltip: (args: {
    tooltipData: any;
    tooltipLeft: number;
    tooltipTop: number;
  }) => void;
  hideTooltip: () => void;
}

const GenerationalHistoricalDisplay: React.FC<
  GenerationalHistoricalDisplayProps
> = ({
  width,
  height,
  config,
  lifelinesData,
  eventsData,
  historicalPeriodsData,
  viewRange,
  initialViewDurationMs,
  translateX,
  onTaskClick,
  showTooltip,
  hideTooltip,
}) => {
  const margin = defaultMargin;
  const xMax = Math.max(0, width - margin.left - margin.right); // translateX is applied to the Group
  const yMax = Math.max(0, height - margin.top - margin.bottom);

  const timeScale = useMemo(
    () =>
      scaleTime<number>({
        domain: [viewRange.start, viewRange.end],
        range: [0, xMax],
        clamp: true,
      }),
    [xMax, viewRange.start, viewRange.end],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, lifelinesData.length],
        range: [0, yMax],
      }),
    [yMax, lifelinesData.length],
  );

  const currentViewDurationMs =
    viewRange.end.getTime() - viewRange.start.getTime();
  let currentScaleFactor = 1;
  if (currentViewDurationMs > 0 && initialViewDurationMs > 0) {
    currentScaleFactor = Math.max(
      0.001,
      initialViewDurationMs / currentViewDurationMs,
    );
  }

  const lifelineTrackHeight = useMemo(() => {
    if (lifelinesData.length === 0 || yMax <= 0) return 20;
    const heightPerSlot = yMax / lifelinesData.length;
    const padding = Math.min(5, heightPerSlot * 0.1);
    return Math.max(10, heightPerSlot - padding);
  }, [lifelinesData.length, yMax]);

  const eventPointSize = Math.max(
    2,
    Math.min(10, 6 / Math.sqrt(currentScaleFactor)),
  );
  const durationEventHeight = Math.max(
    4,
    Math.min(15, 10 / Math.sqrt(currentScaleFactor)),
  );

  const handleMouseEvent = useCallback(
    (event: React.MouseEvent, itemData: any, type: string) => {
      const point = localPoint(event.target as SVGElement, event);
      if (point) {
        showTooltip({
          tooltipLeft: point.x,
          tooltipTop: point.y,
          tooltipData: { ...itemData, item_type: type }, // Renamed 'type' to 'item_type' to avoid conflict
        });
      }
    },
    [showTooltip],
  );

  if (width < 10 || height < 10 || xMax <= 0 || yMax <= 0)
    return <div style={{ padding: 10, color: "gray" }}>Widget too small.</div>;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <Group left={margin.left + translateX} top={margin.top}>
        <GridRows
          scale={yScale}
          width={xMax}
          numTicks={lifelinesData.length}
          stroke="#e0e0e0"
          strokeOpacity={0.3}
        />
        <GridColumns
          scale={timeScale}
          height={yMax}
          numTicks={10}
          stroke="#e0e0e0"
          strokeOpacity={0.3}
        />

        {config.showHistoricalPeriods &&
          historicalPeriodsData.map((period) => {
            const pStart = eventDateToDate(period.startDate, "start");
            const pEnd = eventDateToDate(period.endDate, "end");
            if (
              !pStart ||
              !pEnd ||
              pEnd < viewRange.start ||
              pStart > viewRange.end
            )
              return null;

            const x1 = timeScale(
              new Date(Math.max(pStart.getTime(), viewRange.start.getTime())),
            );
            const x2 = timeScale(
              new Date(Math.min(pEnd.getTime(), viewRange.end.getTime())),
            );
            const barWidth = x2 - x1;
            if (barWidth <= 0) return null;

            return (
              <Bar
                key={`hist-${period.id}`}
                x={x1}
                y={0}
                width={barWidth}
                height={yMax}
                fill={period.color}
                opacity={0.15}
                onMouseOver={(e) =>
                  handleMouseEvent(e, period, "Historical Period")
                }
                onMouseOut={hideTooltip}
                onClick={() => onTaskClick && onTaskClick(period)}
                style={{ cursor: "pointer" }}
              />
            );
          })}

        {lifelinesData.map((lifeline, index) => {
          const lStart = eventDateToDate(lifeline.birthDate, "start");
          const lEndActual = lifeline.deathDate
            ? eventDateToDate(lifeline.deathDate, "end")
            : null;
          const lEndForRender = lEndActual || viewRange.end;

          if (
            !lStart ||
            lEndForRender < viewRange.start ||
            lStart > viewRange.end
          )
            return null;

          const x1 = timeScale(
            new Date(Math.max(lStart.getTime(), viewRange.start.getTime())),
          );
          const x2 = timeScale(
            new Date(
              Math.min(lEndForRender.getTime(), viewRange.end.getTime()),
            ),
          );
          const lifelineBarWidth = x2 - x1;

          const trackY = yScale(index);
          const barCenterY = trackY + (yScale(index + 1) - trackY) / 2;

          return (
            <Group key={`lifeline-group-${lifeline.id}`}>
              {lifelineBarWidth > 0 && (
                <Bar
                  x={x1}
                  y={
                    trackY +
                    (yScale(index + 1) - trackY - lifelineTrackHeight) / 2
                  }
                  width={lifelineBarWidth}
                  height={lifelineTrackHeight}
                  fill={lifeline.color}
                  opacity={0.4}
                  rx={3}
                  onMouseOver={(e) => handleMouseEvent(e, lifeline, "Lifeline")}
                  onMouseOut={hideTooltip}
                  onClick={() => onTaskClick && onTaskClick(lifeline)}
                  style={{ cursor: "pointer" }}
                />
              )}
              {eventsData
                .filter((event) => event.lifelineId === lifeline.id)
                .map((event) => {
                  const eStart = eventDateToDate(event.startDate, "start");
                  if (
                    !eStart ||
                    eStart < viewRange.start ||
                    eStart > viewRange.end
                  )
                    return null;

                  const eventX = timeScale(eStart);

                  if (event.type === "point") {
                    return (
                      <circle
                        key={`event-${event.id}`}
                        cx={eventX}
                        cy={barCenterY}
                        r={eventPointSize}
                        fill={event.color || lifeline.color || "#333"}
                        stroke="#fff"
                        strokeWidth={0.5 / currentScaleFactor}
                        onMouseOver={(e) => handleMouseEvent(e, event, "Event")}
                        onMouseOut={hideTooltip}
                        onClick={() => onTaskClick && onTaskClick(event)}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  } else if (event.type === "duration") {
                    const eEnd = event.endDate
                      ? eventDateToDate(event.endDate, "end")
                      : null;
                    if (
                      !eEnd ||
                      eEnd < viewRange.start ||
                      eStart > viewRange.end
                    )
                      return null;

                    const durationX1 = timeScale(
                      new Date(
                        Math.max(eStart.getTime(), viewRange.start.getTime()),
                      ),
                    );
                    const durationX2 = timeScale(
                      new Date(
                        Math.min(eEnd.getTime(), viewRange.end.getTime()),
                      ),
                    );
                    const durationWidth = durationX2 - durationX1;
                    if (durationWidth <= 0) return null;

                    return (
                      <Bar
                        key={`event-${event.id}`}
                        x={durationX1}
                        y={barCenterY - durationEventHeight / 2}
                        width={durationWidth}
                        height={durationEventHeight}
                        fill={event.color || lifeline.color || "#555"}
                        opacity={0.7}
                        rx={2}
                        onMouseOver={(e) => handleMouseEvent(e, event, "Event")}
                        onMouseOut={hideTooltip}
                        onClick={() => onTaskClick && onTaskClick(event)}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  }
                  return null;
                })}
            </Group>
          );
        })}

        <Group transform={`translate(0, ${yMax})`}>
          <AxisBottom
            top={0}
            scale={timeScale}
            stroke="#333"
            tickStroke="#333"
            numTicks={Math.max(
              2,
              Math.round(xMax / (100 * Math.sqrt(currentScaleFactor))),
            )}
            tickFormat={universalTickFormat}
            tickLabelProps={() => ({
              dy: "0.25em",
              fontSize: Math.max(6, 10 / Math.sqrt(currentScaleFactor)),
              textAnchor: "middle",
              fill: "#333",
            })}
          />
        </Group>
      </Group>

      <Group left={0} top={margin.top}>
        <AxisLeft
          scale={yScale}
          left={margin.left - 5}
          numTicks={lifelinesData.length}
          tickFormat={(index: number) => {
            const name = lifelinesData[index]?.name || "";
            // Basic truncation if name is too long for the margin
            const maxChar = Math.floor(
              (margin.left - 15) / (8 / Math.sqrt(currentScaleFactor)),
            ); // Estimate chars based on font size
            return name.length > maxChar
              ? name.substring(0, maxChar - 1) + "…"
              : name;
          }}
          hideTicks
          hideAxisLine
          tickLabelProps={() => ({
            dx: "-0.2em", // Adjust to align text properly before the chart area
            dy: "0.3em", // Vertical alignment
            fontSize: Math.max(8, 12 / Math.sqrt(currentScaleFactor)),
            textAnchor: "end",
            fill: "#333",
          })}
        />
      </Group>
    </svg>
  );
};

// --- Main Widget Component ---
export const GenerationalHistoricalWidget: React.FC<
  WidgetProps<GenerationalHistoricalWidgetConfig>
> = ({ id, config, onRemove, onWidgetConfigure }) => {
  const [processedLifelines, setProcessedLifelines] = useState<Lifeline[]>([]);
  const [eventsData, setEventsData] = useState<TimelineEvent[]>(MOCK_EVENTS);
  const [historicalPeriodsData, setHistoricalPeriodsData] = useState<
    HistoricalPeriod[]
  >(MOCK_HISTORICAL_PERIODS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLifelines = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "http://localhost:8000/api/entities?entity_type=person",
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }
        const data: BackendPersonEntity[] = await response.json();

        const transformedLifelines: Lifeline[] = data
          .map((person, index): Lifeline | null => {
            const birthAttr = person.attributes.birth;
            const deathAttr = person.attributes.death;

            let birthEventDate: EventDate | undefined;
            if (birthAttr && birthAttr.value) {
              birthEventDate = {
                date: birthAttr.value.substring(0, 10),
                precision: "day",
              };
            } else {
              console.warn(
                `Person ${person.name} is missing birth date value. Skipping.`,
              );
              return null;
            }

            let deathEventDate: EventDate | undefined;
            if (deathAttr && deathAttr.value) {
              deathEventDate = {
                date: deathAttr.value.substring(0, 10),
                precision: "day",
              };
            }

            const lifelineId = person.name;

            return {
              id: lifelineId,
              name: person.name,
              birthDate: birthEventDate,
              deathDate: deathEventDate,
              color: LIFELINE_COLORS[index % LIFELINE_COLORS.length],
            };
          })
          .filter((lifeline): lifeline is Lifeline => lifeline !== null); // Type guard

        setProcessedLifelines(transformedLifelines);
      } catch (e: any) {
        setError(e.message || "Failed to fetch or process lifelines data.");
        console.error("Fetch/Process error:", e);
        setProcessedLifelines([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLifelines();
  }, []);

  const initialViewRange = useMemo(() => {
    const allDatesRaw: (Date | null)[] = [];

    processedLifelines.forEach((item) => {
      allDatesRaw.push(eventDateToDate(item.birthDate, "start"));
      if (item.deathDate)
        allDatesRaw.push(eventDateToDate(item.deathDate, "end"));
    });
    eventsData.forEach((item) => {
      allDatesRaw.push(eventDateToDate(item.startDate, "start"));
      if (item.endDate) allDatesRaw.push(eventDateToDate(item.endDate, "end"));
    });
    historicalPeriodsData.forEach((item) => {
      allDatesRaw.push(eventDateToDate(item.startDate, "start"));
      allDatesRaw.push(eventDateToDate(item.endDate, "end"));
    });

    const validDates = allDatesRaw.filter(
      (d) => d instanceof Date && !isNaN(d.getTime()),
    ) as Date[];

    if (validDates.length === 0) {
      const now = new Date();
      return {
        start: new Date(Date.UTC(now.getUTCFullYear() - 20, 0, 1)),
        end: new Date(Date.UTC(now.getUTCFullYear() + 5, 0, 1)),
      };
    }

    let minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
    let maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));

    const dateSpanYears = maxDate.getUTCFullYear() - minDate.getUTCFullYear();
    const paddingYears = Math.max(5, Math.ceil(dateSpanYears * 0.1));

    minDate = new Date(Date.UTC(minDate.getUTCFullYear() - paddingYears, 0, 1));
    maxDate = new Date(
      Date.UTC(
        maxDate.getUTCFullYear() + paddingYears,
        11,
        31,
        23,
        59,
        59,
        999,
      ),
    );

    let duration = maxDate.getTime() - minDate.getTime();
    if (duration < MIN_VIEW_DURATION_MS) {
      const diffToMin = MIN_VIEW_DURATION_MS - duration;
      minDate = new Date(minDate.getTime() - diffToMin / 2);
      maxDate = new Date(maxDate.getTime() + diffToMin / 2);
    } else if (duration > MAX_VIEW_DURATION_MS) {
      maxDate = new Date(minDate.getTime() + MAX_VIEW_DURATION_MS);
    }

    return { start: minDate, end: maxDate };
  }, [processedLifelines, eventsData, historicalPeriodsData]);

  const initialViewDurationMs = useMemo(() => {
    return initialViewRange.end.getTime() - initialViewRange.start.getTime();
  }, [initialViewRange]);

  const [viewRange, setViewRange] = useState(initialViewRange);

  useEffect(() => {
    setViewRange(initialViewRange);
  }, [initialViewRange]);

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    viewAtDragStart: { start: Date; end: Date };
  } | null>(null);
  const widthRef = useRef(0);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<any>();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      // Store the viewRange at drag start, not initialTranslateX as translateX is only visual during drag
      dragStartRef.current = {
        x: e.clientX,
        viewAtDragStart: { ...viewRange },
      };
      if (scrollableContainerRef.current)
        scrollableContainerRef.current.style.cursor = "grabbing";
    },
    [viewRange],
  ); // Depends on current viewRange

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      const dx = e.clientX - dragStartRef.current.x;
      setTranslateX(dx); // Visually move the content by setting translateX
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (scrollableContainerRef.current)
        scrollableContainerRef.current.style.cursor = "grab";
      if (isDragging && dragStartRef.current) {
        e.stopPropagation();
        e.preventDefault();

        const pixelDelta = translateX; // This is the total drag distance from drag start

        if (Math.abs(pixelDelta) > 0 && widthRef.current > 0) {
          const { viewAtDragStart } = dragStartRef.current;
          const currentViewDuration =
            viewAtDragStart.end.getTime() - viewAtDragStart.start.getTime();
          const timePerPixel = currentViewDuration / widthRef.current;
          const timeShift = pixelDelta * timePerPixel;

          const newStartMs = viewAtDragStart.start.getTime() - timeShift;
          const newEndMs = viewAtDragStart.end.getTime() - timeShift;

          setViewRange({
            start: new Date(newStartMs),
            end: new Date(newEndMs),
          });
        }
        setTranslateX(0); // Reset visual translateX
        dragStartRef.current = null;
      }
      setIsDragging(false);
    },
    [isDragging, translateX, widthRef],
  ); // Removed viewRange from deps, use dragStartRef.current.viewAtDragStart

  const handleZoom = useCallback(
    (zoomFactor: number, mouseClientX?: number) => {
      const oldViewStartMs = viewRange.start.getTime();
      const oldViewEndMs = viewRange.end.getTime();
      const oldViewDuration = oldViewEndMs - oldViewStartMs;

      let newViewDuration = oldViewDuration / zoomFactor;
      newViewDuration = Math.max(
        MIN_VIEW_DURATION_MS,
        Math.min(MAX_VIEW_DURATION_MS, newViewDuration),
      );

      if (
        newViewDuration === oldViewDuration &&
        oldViewDuration === MIN_VIEW_DURATION_MS &&
        zoomFactor > 1
      )
        return;
      if (
        newViewDuration === oldViewDuration &&
        oldViewDuration === MAX_VIEW_DURATION_MS &&
        zoomFactor < 1
      )
        return;

      let zoomOriginFraction = 0.5;
      if (mouseClientX !== undefined && widthRef.current > 0) {
        const chartX =
          mouseClientX -
          (scrollableContainerRef.current?.getBoundingClientRect().left || 0) -
          defaultMargin.left;
        zoomOriginFraction = chartX / widthRef.current;
        zoomOriginFraction = Math.max(0, Math.min(1, zoomOriginFraction));
      }

      const timeAtZoomOrigin =
        oldViewStartMs + oldViewDuration * zoomOriginFraction;
      const newStartMs =
        timeAtZoomOrigin - newViewDuration * zoomOriginFraction;
      const newEndMs = newStartMs + newViewDuration;

      setViewRange({ start: new Date(newStartMs), end: new Date(newEndMs) });
    },
    [viewRange, widthRef],
  );

  useEffect(() => {
    const element = scrollableContainerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (element && element.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
        handleZoom(
          e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR,
          e.clientX,
        );
      }
    };
    if (element) {
      element.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (element) element.removeEventListener("wheel", handleWheel);
    };
  }, [handleZoom]);

  const handleMouseLeaveChart = useCallback(() => {
    if (isDragging) {
      handleMouseUp(new MouseEvent("mouseup") as any);
    }
  }, [isDragging, handleMouseUp]);

  const handleTaskClick = (item: any) => {
    console.log("Clicked item:", item);
  };

  if (isLoading) {
    return (
      <BaseWidget
        id={id}
        title={config.name || "Generational Timeline"}
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          Loading timeline data...
        </div>
      </BaseWidget>
    );
  }

  if (error) {
    return (
      <BaseWidget
        id={id}
        title={config.name || "Generational Timeline"}
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "red",
            padding: "10px",
          }}
        >
          <p>Error loading timeline data:</p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontSize: "0.8em",
            }}
          >
            {error}
          </pre>
        </div>
      </BaseWidget>
    );
  }

  if (!isLoading && processedLifelines.length === 0 && !error) {
    return (
      <BaseWidget
        id={id}
        title={config.name || "Generational Timeline"}
        onRemove={onRemove}
        onConfigure={onWidgetConfigure}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            padding: "10px",
            color: "#777",
          }}
        >
          No person data found to display.
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      id={id}
      title={config.name || "Generational Timeline"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          touchAction: "none",
        }}
      >
        <ParentSize>
          {({ width, height }) => {
            widthRef.current = Math.max(
              0,
              width - defaultMargin.left - defaultMargin.right,
            );
            if (
              width < defaultMargin.left + defaultMargin.right + 20 ||
              height < defaultMargin.top + defaultMargin.bottom + 20
            ) {
              return (
                <div
                  style={{
                    padding: 10,
                    color: "gray",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  Widget area too small.
                </div>
              );
            }
            return (
              <div
                ref={scrollableContainerRef}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeaveChart}
              >
                <GenerationalHistoricalDisplay
                  width={width}
                  height={height}
                  config={config}
                  lifelinesData={processedLifelines}
                  eventsData={eventsData}
                  historicalPeriodsData={historicalPeriodsData}
                  viewRange={viewRange}
                  setViewRange={setViewRange} // Pass directly if needed by Display, though not used there now
                  initialViewDurationMs={initialViewDurationMs}
                  translateX={translateX}
                  onTaskClick={handleTaskClick}
                  showTooltip={showTooltip}
                  hideTooltip={hideTooltip}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoom(ZOOM_BUTTON_FACTOR);
                    }}
                    style={{ padding: 5 }}
                  >
                    +
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoom(1 / ZOOM_BUTTON_FACTOR);
                    }}
                    style={{ padding: 5 }}
                  >
                    -
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewRange(initialViewRange);
                      setTranslateX(0);
                    }}
                    style={{ padding: 5, fontSize: "0.7em" }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          }}
        </ParentSize>
        {tooltipOpen &&
          tooltipData &&
          tooltipLeft != null &&
          tooltipTop != null && (
            <Tooltip
              top={tooltipTop}
              left={tooltipLeft}
              style={{
                position: "absolute",
                backgroundColor: "rgba(0,0,0,0.75)",
                color: "white",
                padding: "5px 10px",
                borderRadius: "4px",
                fontSize: "0.85em",
                pointerEvents: "none",
                whiteSpace: "pre-line",
                zIndex: 1001, // Ensure tooltip is on top
              }}
            >
              <strong>{tooltipData.name || tooltipData.title}</strong> (
              {tooltipData.item_type})
              <br />
              {tooltipData.startDate &&
                `Starts: ${eventDateToDate(tooltipData.startDate)?.toLocaleDateString()}`}
              {tooltipData.endDate &&
                ` - Ends: ${eventDateToDate(tooltipData.endDate)?.toLocaleDateString()}`}
              {tooltipData.birthDate &&
                `Born: ${eventDateToDate(tooltipData.birthDate)?.toLocaleDateString()}`}
              {tooltipData.deathDate &&
                ` - Died: ${eventDateToDate(tooltipData.deathDate)?.toLocaleDateString()}`}
              {tooltipData.description && `\n${tooltipData.description}`}
            </Tooltip>
          )}
      </div>
    </BaseWidget>
  );
};
