import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { BaseWidget } from "../BaseWidget";
import { WidgetProps } from "../../../widgets/registry";
import { scaleTime, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { Bar, Line } from "@visx/shape";
import { GridRows } from "@visx/grid";
import { Tooltip, useTooltip } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { timeFormat } from "d3-time-format";
import {
  timeSecond,
  timeMinute,
  timeHour,
  timeDay,
  timeSunday, // Or timeMonday depending on preferred week start
  timeMonth,
  timeYear,
} from "d3-time"; // For the multi-scale formatter
import { ParentSize } from "@visx/responsive";

// Define our task types
interface Task {
  id: string;
  name: string;
  scheduled: {
    start: Date;
    end: Date;
  };
  actual?: {
    start?: Date;
    end?: Date;
  };
  status: "scheduled" | "in-progress" | "completed" | "interrupted";
  tags: string[];
  isAnchor?: boolean;
  dependsOn?: string[];
  interruptions?: Array<{
    start: Date;
    end: Date;
    reason: string;
  }>;
}

interface TimelineConfig {
  name: string;
  timeRange: {
    start: Date | string;
    end: Date | string;
  };
  showNowBar: boolean;
  groupByTags: boolean;
  showInterruptions: boolean;
  filters?: {
    tags?: string[];
    status?: ("scheduled" | "in-progress" | "completed" | "interrupted")[];
  };
}

interface TaskWithRow extends Task {
  rowIndex: number;
}

export interface TimelineWidgetSpecificProps {
  tasks: Task[];
}

function assignTasksToRows(tasks: Task[]): {
  processedTasks: TaskWithRow[];
  numberOfRows: number;
} {
  if (!tasks || tasks.length === 0) {
    return { processedTasks: [], numberOfRows: 1 }; // Ensure at least 1 row for empty state
  }

  // Ensure tasks are sorted by start time, then by end time as a tie-breaker
  const sortedOriginalTasks = [...tasks].sort((a, b) => {
    const startDiff = a.scheduled.start.getTime() - b.scheduled.start.getTime();
    if (startDiff !== 0) return startDiff;
    return a.scheduled.end.getTime() - b.scheduled.end.getTime();
  });

  const tasksWithAssignedRows: TaskWithRow[] = [];
  const rowEndTimes: number[] = []; // Stores the end time of the last task in each row

  for (const task of sortedOriginalTasks) {
    let placed = false;
    for (let i = 0; i < rowEndTimes.length; i++) {
      // Task can fit if its start is >= end of last task in this row
      if (task.scheduled.start.getTime() >= rowEndTimes[i]) {
        tasksWithAssignedRows.push({ ...task, rowIndex: i });
        rowEndTimes[i] = task.scheduled.end.getTime(); // Update the end time for this row
        placed = true;
        break;
      }
    }

    if (!placed) {
      // No existing row can accommodate this task, create a new row
      const newRowIndex = rowEndTimes.length;
      tasksWithAssignedRows.push({ ...task, rowIndex: newRowIndex });
      rowEndTimes.push(task.scheduled.end.getTime());
    }
  }
  // The final list tasksWithAssignedRows is not sorted by rowIndex, but that's fine
  // for rendering as each task knows its row.
  // Number of rows is simply the count of rows we ended up using.
  const actualNumberOfRows = rowEndTimes.length > 0 ? rowEndTimes.length : 1;

  return {
    processedTasks: tasksWithAssignedRows,
    numberOfRows: actualNumberOfRows,
  };
}

const formatTime = timeFormat("%H:%M");
const formatDate = timeFormat("%b %d, %Y");

const formatYear = timeFormat("%Y");
const formatMonth = timeFormat("%b '%y");
const formatDay = timeFormat("%b %d");
const formatHour = timeFormat("%H:%M");

const getTimeFormat = (timeRange: { start: Date; end: Date }) => {
  const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > 365 * 2) return formatYear;
  if (diffDays > 60) return formatMonth;
  if (diffDays > 2) return formatDay;
  return formatHour;
};

const colors = {
  scheduled: "#dbeafe",
  "in-progress": "#93c5fd",
  completed: "#60a5fa",
  interrupted: "#f87171",
  anchor: "#10b981",
  nowBar: "#ef4444",
};

interface InterruptionDetails {
  start: Date;
  end: Date;
  reason: string;
}

type TooltipTaskData = Task & { interruption_details?: InterruptionDetails };

const defaultMargin = { top: 20, right: 20, bottom: 40, left: 100 };

const fmtMs = timeFormat(".%L"); // Milliseconds: .123
const fmtSec = timeFormat(":%S"); // Seconds: :15
const fmtMin = timeFormat("%H:%M"); // Minutes: 10:30
const fmtHour = timeFormat("%H:%M"); // Hours: 10:00 (could also be "%I %p" for 10 AM)
const fmtDay = timeFormat("%a %d"); // Day of week + day of month: Mon 05
const fmtWeek = timeFormat("%b %d"); // Month + day of month (used for week start): Jan 05
const fmtMonth = timeFormat("%B"); // Full month name: January
const fmtYear = timeFormat("%Y"); // Full year: 2023

// The core function to decide how to format a date tick
function universalTickFormat(date: Date): string {
  if (timeSecond(date) < date) {
    // Sub-second precision
    return fmtMs(date);
  }
  if (timeMinute(date) < date) {
    // Sub-minute precision
    return fmtSec(date);
  }
  if (timeHour(date) < date) {
    // Sub-hour precision
    return fmtMin(date);
  }
  if (timeDay(date) < date) {
    // Sub-day precision (specific hour)
    return fmtHour(date);
  }
  // Date is at the start of a day (midnight)
  if (timeMonth(date) < date) {
    // It's a specific day, not the start of a month
    // If it's start of a week (e.g. Sunday), use fmtWeek, otherwise fmtDay
    // timeSunday(date) returns the preceding or coincident Sunday.
    // So, if date IS Sunday, timeSunday(date) == date.
    // If date is Monday, timeSunday(date) < date.
    if (timeSunday(date) < date) {
      // Not the start of a Sunday-based week
      return fmtDay(date); // e.g., "Mon 05"
    }
    return fmtWeek(date); // e.g., "Jan 01" (if it's a Sunday) or "Jan 08" (if it's a Sunday)
  }
  // Date is at the start of a month
  if (timeYear(date) < date) {
    // It's a specific month, not the start of a year
    return fmtMonth(date); // e.g., "February"
  }
  // Date is at the start of a year
  return fmtYear(date); // e.g., "2023"
}
// --- End of multi-scale time formatters ---

// Helper to determine appropriate time format based on time range
// THIS getTimeFormat IS NO LONGER USED FOR AXIS TICK FORMATTING.
// It can still be useful for general display elsewhere if needed, or can be removed if not.
const getTimeFormat_Legacy = (timeRange: { start: Date; end: Date }) => {
  const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > 365 * 2) return formatYear; // from d3-time-format
  if (diffDays > 60) return timeFormat("%b '%y");
  if (diffDays > 2) return timeFormat("%b %d");
  return timeFormat("%H:%M");
};

export const TimelineContent: React.FC<{
  width: number;
  height: number;
  effectiveConfig: TimelineConfig;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onMouseOverTask?: (
    event: React.MouseEvent,
    task: Task,
    interruption?: InterruptionDetails,
  ) => void;
  onMouseOutTask?: () => void;
  currentScale: number;
}> = ({
  width,
  height,
  effectiveConfig,
  tasks,
  onTaskClick,
  onMouseOverTask,
  onMouseOutTask,
  currentScale,
}) => {
  const margin = defaultMargin;
  const xMax = Math.max(0, width - margin.left - margin.right);
  const yMax = Math.max(0, height - margin.top - margin.bottom);

  const { processedTasks, numberOfRows } = useMemo(
    () => assignTasksToRows(tasks),
    [tasks],
  );

  const timeScale = useMemo(
    () =>
      scaleTime<number>({
        domain: [
          effectiveConfig.timeRange.start,
          effectiveConfig.timeRange.end,
        ],
        range: [0, xMax],
        clamp: true,
      }),
    [xMax, effectiveConfig.timeRange.start, effectiveConfig.timeRange.end],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, numberOfRows], // Domain is 0 to total number of packed rows
        range: [0, yMax],
      }),
    [yMax, numberOfRows],
  );

  const barHeight = useMemo(() => {
    // Use numberOfRows for bar height calculation
    if (numberOfRows === 0 || yMax <= 0 || processedTasks.length === 0)
      return 0;
    const heightPerSlot = yMax / numberOfRows;
    const padding = Math.min(5, heightPerSlot * 0.2); // Padding relative to slot height
    const maxBarHeight = 40; // Increased max bar height a bit
    const calculatedBarHeight = Math.max(0, heightPerSlot - padding);
    return Math.min(maxBarHeight, calculatedBarHeight);
  }, [numberOfRows, yMax, processedTasks.length]);

  const nowPosition = useMemo(() => {
    const now = new Date();
    if (
      now < effectiveConfig.timeRange.start ||
      now > effectiveConfig.timeRange.end
    ) {
      return null;
    }
    return timeScale(now);
  }, [
    timeScale,
    effectiveConfig.timeRange.start,
    effectiveConfig.timeRange.end,
  ]);

  const axisFontSize = 10;
  const taskTextVisualScale = Math.max(0.3, Math.min(1.5, 1 / currentScale));
  const nowBarStrokeWidth = Math.max(1, Math.min(3, 2 / currentScale));
  const desiredTickSpacing = 100;
  const numTicksForAxis = Math.max(2, Math.round(xMax / desiredTickSpacing));

  const TEXT_BASE_FONT_SIZE = 10;
  const TEXT_PADDING_X_INSIDE_BAR_BASE = 4; // Padding at base font size
  const MIN_BAR_WIDTH_FOR_TEXT_PX = 25; // Minimum bar width in screen pixels to show any text
  const AVG_CHAR_WIDTH_AT_BASE_FONT_SIZE = TEXT_BASE_FONT_SIZE * 0.6; // Heuristic

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <Group left={margin.left} top={margin.top}>
        <GridRows
          scale={yScale}
          width={xMax}
          numTicks={numberOfRows}
          stroke="#e2e8f0"
          strokeOpacity={0.3}
        />
        {barHeight > 0 &&
          processedTasks.map((task) => {
            const slotHeight = yMax / numberOfRows;
            const slotTopY = yScale(task.rowIndex);
            const y = slotTopY + (slotHeight - barHeight) / 2;

            const taskScheduledStart = task.scheduled.start;
            const taskScheduledEnd = task.scheduled.end;

            if (
              taskScheduledEnd < effectiveConfig.timeRange.start ||
              taskScheduledStart > effectiveConfig.timeRange.end
            ) {
              return null;
            }

            const visibleStart = new Date(
              Math.max(
                taskScheduledStart.getTime(),
                effectiveConfig.timeRange.start.getTime(),
              ),
            );
            const visibleEnd = new Date(
              Math.min(
                taskScheduledEnd.getTime(),
                effectiveConfig.timeRange.end.getTime(),
              ),
            );

            const x1 = timeScale(visibleStart);
            const x2 = timeScale(visibleEnd);
            const taskBarWidth = Math.max(0.1, x2 - x1);

            if (taskBarWidth <= 0) return null;

            let displayNameNode = null;
            if (
              taskBarWidth >= MIN_BAR_WIDTH_FOR_TEXT_PX &&
              taskTextVisualScale > 0.25
            ) {
              const scaledTextPaddingX =
                TEXT_PADDING_X_INSIDE_BAR_BASE * taskTextVisualScale;
              const availableWidthForTextInBar =
                taskBarWidth - 2 * scaledTextPaddingX;

              if (
                availableWidthForTextInBar >
                AVG_CHAR_WIDTH_AT_BASE_FONT_SIZE * taskTextVisualScale * 1.5
              ) {
                // Check if space for at least 1.5 chars
                const maxChars = Math.floor(
                  availableWidthForTextInBar /
                    (AVG_CHAR_WIDTH_AT_BASE_FONT_SIZE * taskTextVisualScale),
                );

                let nameToShow = task.name;
                if (task.name.length > maxChars && maxChars > 1) {
                  nameToShow = task.name.substring(0, maxChars - 1) + "…";
                } else if (maxChars <= 1 && task.name.length > 1) {
                  // Not enough space for even one char + ellipsis, or just one char if name is one char
                  nameToShow = ""; // Hide text if it would be just "…" or too cramped
                } else if (maxChars <= 1 && task.name.length === 1) {
                  nameToShow = task.name; // Show single character name if it fits
                }

                if (nameToShow) {
                  displayNameNode = (
                    <g
                      transform={`translate(${x1}, ${y + barHeight / 2}) scale(${taskTextVisualScale}, ${taskTextVisualScale})`}
                      style={{ pointerEvents: "none" }} // Allow clicks to pass through to the bar
                    >
                      <text
                        x={TEXT_PADDING_X_INSIDE_BAR_BASE} // Padding from left, in base units (scaled by parent g)
                        y={0} // Centered by dominantBaseline
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize={TEXT_BASE_FONT_SIZE} // Base font size, effectively scaled by parent <g>
                        fill="#111827" // Slightly darker for better contrast on lighter blues
                        // fill="#1e293b" // Original dark slate gray
                      >
                        {nameToShow}
                      </text>
                    </g>
                  );
                }
              }
            }

            return (
              <React.Fragment key={task.id + `-row-${task.rowIndex}`}>
                <Bar
                  x={x1}
                  y={y}
                  width={taskBarWidth}
                  height={barHeight}
                  fill={task.isAnchor ? colors.anchor : colors[task.status]}
                  opacity={0.75}
                  rx={3}
                  onMouseOver={(e) =>
                    onMouseOverTask && onMouseOverTask(e, task)
                  }
                  onMouseOut={onMouseOutTask}
                  onClick={() => onTaskClick && onTaskClick(task)}
                  style={{ cursor: "pointer" }}
                />
                {displayNameNode}
              </React.Fragment>
            );
          })}

        {effectiveConfig.showNowBar &&
          nowPosition !== null &&
          nowPosition >= 0 &&
          nowPosition <= xMax && (
            <Line
              from={{ x: nowPosition, y: 0 }}
              to={{ x: nowPosition, y: yMax }}
              stroke={colors.nowBar}
              strokeWidth={nowBarStrokeWidth}
              strokeDasharray={`${4 / nowBarStrokeWidth},${2 / nowBarStrokeWidth}`}
              pointerEvents="none"
            />
          )}

        <g transform={`translate(0, ${yMax})`}>
          <AxisBottom
            top={0}
            scale={timeScale}
            stroke="#94a3b8"
            tickStroke="#94a3b8"
            numTicks={numTicksForAxis} // Use our calculated numTicks
            tickFormat={universalTickFormat} // Use the new universal formatter
            tickLabelProps={() => ({
              dy: "0.25em",
              fontSize: axisFontSize, // Use the fixed axis font size
              textAnchor: "middle",
              fill: "#4b5563",
            })}
          />
        </g>
      </Group>
    </svg>
  );
};

// Zoom constants
const ZOOM_BUTTON_FACTOR = 1.2; // Zoom in by 20%
const ZOOM_WHEEL_FACTOR = 1.075; // Zoom in by 7.5% for finer scroll wheel control

// Min/Max viewable duration
const MIN_VIEW_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VIEW_DURATION_MS = 200 * 365.25 * 24 * 60 * 60 * 1000; // 200 years

export const TimelineWidget: React.FC<
  WidgetProps<TimelineConfig> & TimelineWidgetSpceficProps
> = ({ id, config, tasks, onRemove }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipTaskData>();

  const [translateX, setTranslateX] = useState(0); // For visual feedback during drag
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; initialTranslateX: number } | null>(
    null,
  );

  const widthRef = useRef(0); // Stores the chart area width (xMax)

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const effectiveViewRange = useMemo(
    () => ({
      start:
        typeof config.timeRange.start === "string"
          ? new Date(config.timeRange.start)
          : config.timeRange.start,
      end:
        typeof config.timeRange.end === "string"
          ? new Date(config.timeRange.end)
          : config.timeRange.end,
    }),
    [config.timeRange.start, config.timeRange.end],
  );
  const [viewRange, setViewRange] =
    useState<TimelineConfig["timeRange"]>(effectiveViewRange);
  useEffect(() => {
    setViewRange(effectiveViewRange);
  }, [effectiveViewRange]);

  const initialViewDurationMs = useMemo(() => {
    const start =
      typeof config.timeRange.start === "string"
        ? new Date(config.timeRange.start)
        : config.timeRange.start;
    const end =
      typeof config.timeRange.end === "string"
        ? new Date(config.timeRange.end)
        : config.timeRange.end;
    const duration = end.getTime() - start.getTime();
    return duration > 0 ? duration : 24 * 60 * 60 * 1000;
  }, [config.timeRange.start, config.timeRange.end]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, initialTranslateX: translateX };
      if (e.target instanceof HTMLElement) {
        // Ensure target is HTMLElement
        e.target.style.cursor = "grabbing";
      }
    },
    [translateX],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      const dx = e.clientX - dragStartRef.current.x;
      setTranslateX(dragStartRef.current.initialTranslateX + dx);
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof HTMLElement) {
        e.target.style.cursor = "grab";
      }
      if (isDragging) {
        e.stopPropagation();
        e.preventDefault();

        const pixelDelta = translateX - dragStartRef.current!.initialTranslateX;

        if (Math.abs(pixelDelta) > 0 && widthRef.current > 0) {
          const currentViewDuration =
            viewRange.end.getTime() - viewRange.start.getTime();

          const timePerPixel = currentViewDuration / widthRef.current;
          const timeShift = pixelDelta * timePerPixel;

          const newStartMs = viewRange.start.getTime() - timeShift;
          const newEndMs = viewRange.end.getTime() - timeShift;

          setViewRange({
            start: new Date(newStartMs),
            end: new Date(newEndMs),
          });
        }
        setTranslateX(0);
        dragStartRef.current = null;
      }
      setIsDragging(false);
    },
    [isDragging, translateX, viewRange.start, viewRange.end], // widthRef.current implicitly used via closure
  );

  const handleZoom = useCallback(
    (zoomFactor: number, mouseClientX?: number) => {
      const oldViewStartMs = viewRange.start.getTime();
      const oldViewEndMs = viewRange.end.getTime();
      const oldViewDuration = oldViewEndMs - oldViewStartMs;
      let newViewDuration = oldViewDuration / zoomFactor;
      if (newViewDuration < MIN_VIEW_DURATION_MS && zoomFactor > 1) {
        newViewDuration = MIN_VIEW_DURATION_MS;
      } else if (newViewDuration > MAX_VIEW_DURATION_MS && zoomFactor < 1) {
        newViewDuration = MAX_VIEW_DURATION_MS;
      }
      if (
        newViewDuration === oldViewDuration &&
        ((oldViewDuration <= MIN_VIEW_DURATION_MS && zoomFactor > 1) ||
          (oldViewDuration >= MAX_VIEW_DURATION_MS && zoomFactor < 1))
      ) {
        return;
      }
      newViewDuration = Math.max(
        MIN_VIEW_DURATION_MS,
        Math.min(MAX_VIEW_DURATION_MS, newViewDuration),
      );

      let zoomOriginFraction = 0.5;
      if (mouseClientX !== undefined && widthRef.current > 0) {
        const chartX = mouseClientX - defaultMargin.left - translateX;
        zoomOriginFraction = chartX / widthRef.current;
        zoomOriginFraction = Math.max(0, Math.min(1, zoomOriginFraction));
      }

      const timeAtZoomOrigin =
        oldViewStartMs + oldViewDuration * zoomOriginFraction;

      const newViewStartMs =
        timeAtZoomOrigin - newViewDuration * zoomOriginFraction;
      const newViewEndMs = newViewStartMs + newViewDuration;

      setViewRange({
        start: new Date(newViewStartMs),
        end: new Date(newViewEndMs),
      });
    },
    [viewRange, translateX], // widthRef.current implicitly used
  );

  const handleZoomIn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleZoom(ZOOM_BUTTON_FACTOR, e.clientX);
    },
    [handleZoom],
  );

  const handleZoomOut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleZoom(1 / ZOOM_BUTTON_FACTOR, e.clientX);
    },
    [handleZoom],
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setViewRange(effectiveViewRange);
      setTranslateX(0);
    },
    [config.timeRange],
  );

  const handleJumpToToday = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const now = new Date();
      const currentViewDuration =
        viewRange.end.getTime() - viewRange.start.getTime();

      // Ensure duration is positive, otherwise default to a 1-day view.
      const durationToUse =
        currentViewDuration > 0 &&
        currentViewDuration >= MIN_VIEW_DURATION_MS &&
        currentViewDuration <= MAX_VIEW_DURATION_MS
          ? currentViewDuration
          : 24 * 60 * 60 * 1000;

      setViewRange({
        start: new Date(now.getTime() - durationToUse / 2),
        end: new Date(now.getTime() + durationToUse / 2),
      });
      setTranslateX(0);
    },
    [viewRange],
  );

  const handleTaskClick = useCallback(
    (task: Task) => setSelectedTask(task),
    [],
  );

  const handleMouseOverTask = useCallback(
    (
      event: React.MouseEvent,
      task: Task,
      interruption?: InterruptionDetails,
    ) => {
      const point = localPoint(event.target as SVGElement, event);
      if (point) {
        const dataToShow = interruption
          ? { ...task, interruption_details: interruption }
          : task;
        showTooltip({
          tooltipLeft: point.x,
          tooltipTop: point.y,
          tooltipData: dataToShow,
        });
      }
    },
    [showTooltip],
  );

  useEffect(() => {
    const element = scrollableContainerRef.current;

    const handleWheel = (e: WheelEvent) => {
      // We must check if the event target is within our scrollable container
      // or one of its children to avoid hijacking scroll on other page elements.
      if (element && element.contains(e.target as Node)) {
        e.stopPropagation(); // Still good to stop propagation if handled
        e.preventDefault(); // This is now safe to call
        handleZoom(
          e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR,
          e.clientX,
        );
      }
    };

    if (element) {
      // Add the event listener with passive: false
      element.addEventListener("wheel", handleWheel, { passive: false });
    }

    // Cleanup function to remove the event listener
    return () => {
      if (element) {
        element.removeEventListener("wheel", handleWheel);
      }
    };
  }, [handleZoom]); // Re-attach if handleZoom changes (though it's stable with useCallback)

  const handleMouseLeaveChart = useCallback(() => {
    if (isDragging) {
      // Simulate mouse up to finalize panning if mouse leaves chart while dragging
      const pixelDelta = translateX - dragStartRef.current!.initialTranslateX;
      if (Math.abs(pixelDelta) > 0 && widthRef.current > 0) {
        const currentViewDuration =
          viewRange.end.getTime() - viewRange.start.getTime();
        const timePerPixel = currentViewDuration / widthRef.current;
        const timeShift = pixelDelta * timePerPixel;
        const newStartMs = viewRange.start.getTime() - timeShift;
        const newEndMs = viewRange.end.getTime() - timeShift;
        setViewRange({ start: new Date(newStartMs), end: new Date(newEndMs) });
      }
      setTranslateX(0);
      dragStartRef.current = null;
      setIsDragging(false);
      if (scrollableContainerRef.current) {
        scrollableContainerRef.current.style.cursor = "grab";
      }
    }
  }, [isDragging, translateX, viewRange]);

  const baseWidgetTitle = config.name || "Timeline";
  return (
    <BaseWidget id={id} title={baseWidgetTitle} onRemove={onRemove}>
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
            if (width < 10 || height < 10) return null;
            const currentViewDurationMs =
              viewRange.end.getTime() - viewRange.start.getTime();
            let derivedScale = 1;
            if (currentViewDurationMs > 0 && initialViewDurationMs > 0) {
              derivedScale = initialViewDurationMs / currentViewDurationMs;
            }
            derivedScale = Math.max(0.00001, derivedScale);
            const contentConfig: TimelineConfig = {
              ...config,
              timeRange: viewRange,
            };
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
                <div
                  style={{
                    transform: `translateX(${translateX}px)`,
                    width: width,
                    height: height,
                  }}
                >
                  <TimelineContent
                    width={width}
                    height={height}
                    effectiveConfig={contentConfig}
                    tasks={tasks}
                    onTaskClick={handleTaskClick}
                    onMouseOverTask={handleMouseOverTask}
                    onMouseOutTask={hideTooltip}
                    currentScale={derivedScale}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "8px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleZoomIn}
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                  >
                    +
                  </button>
                  <button
                    onClick={handleZoomOut}
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <button
                    onClick={handleJumpToToday}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={handleReset}
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                  >
                    Reset
                  </button>
                </div>
                {tooltipOpen &&
                  tooltipData &&
                  tooltipLeft != null &&
                  tooltipTop != null && (
                    <Tooltip
                      top={tooltipTop}
                      left={tooltipLeft}
                      style={{
                        position: "absolute",
                        backgroundColor: "white",
                        color: "black",
                        border: "1px solid #ccc",
                        padding: "8px",
                        borderRadius: "4px",
                        pointerEvents: "none",
                        zIndex: 1000,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div>
                        <strong>{tooltipData.name}</strong>
                      </div>
                      <div>Status: {tooltipData.status}</div>
                      <div>
                        Scheduled: {formatDate(tooltipData.scheduled.start)}{" "}
                        {formatTime(tooltipData.scheduled.start)} -{" "}
                        {formatDate(tooltipData.scheduled.end)}{" "}
                        {formatTime(tooltipData.scheduled.end)}
                      </div>
                      {tooltipData.actual?.start && (
                        <div>
                          Actual: {formatDate(tooltipData.actual.start)}{" "}
                          {formatTime(tooltipData.actual.start)}
                          {tooltipData.actual.end &&
                            ` - ${formatDate(tooltipData.actual.end)} ${formatTime(tooltipData.actual.end)}`}
                        </div>
                      )}
                      {tooltipData.interruption_details && (
                        <div>
                          Interrupted:{" "}
                          {formatDate(tooltipData.interruption_details.start)} -{" "}
                          {formatDate(tooltipData.interruption_details.end)} (
                          {tooltipData.interruption_details.reason})
                        </div>
                      )}
                      {/* ... other tooltip details ... */}
                    </Tooltip>
                  )}
              </div>
            );
          }}
        </ParentSize>
        {selectedTask && (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: 120,
              width: "280px",
              background: "white",
              borderRadius: "4px",
              padding: "12px",
              boxShadow: "0 2px 15px rgba(0,0,0,0.1)",
              zIndex: 1001,
              maxHeight: "calc(100% - 130px)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <h3 style={{ margin: 0 }}>{selectedTask.name}</h3>
              <button
                onClick={() => setSelectedTask(null)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: "12px" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>Status:</strong> {selectedTask.status}
              </div>
              <div style={{ marginBottom: "4px" }}>
                <strong>Scheduled:</strong>
                <br />
                {formatDate(selectedTask.scheduled.start)}{" "}
                {formatTime(selectedTask.scheduled.start)} - <br />
                {formatDate(selectedTask.scheduled.end)}{" "}
                {formatTime(selectedTask.scheduled.end)}
              </div>
              {/* ... other task details ... */}
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};
