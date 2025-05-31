import { DateTime } from "luxon";

import React, { useEffect, useRef } from "react";
import { BaseWidget, WidgetCoreProps } from "../BaseWidget";
import { WidgetProps } from "../../widgets/registry";

export interface ClockHandConfig {
  name: string;
  cycleDurationSeconds: number;
  color: string;
  length: number;
  widthFactor?: number;
  smooth: boolean;
  useInnerScale?: boolean;
  showValueDigitally?: boolean;
}

export interface InnerScaleConfig {
  show: boolean;
  radiusFactor: number;
  divisions: number;
  showNumbers: boolean;
  tickColor?: string;
  numberColor?: string;
  tickLengthFactor?: number;
  numberFontSizeFactor?: number;
}

interface ClockConfig {
  name: string;
  showNumbers: boolean;
  divisions: number;
  minorTicksPerDivision: number;
  innerScale: InnerScaleConfig;
  showDigitalDisplay: boolean;
  digitalDisplayFormat?: string;
  digitalDisplayHourFormat?: "12h" | "24h";
  digitalDisplayCycleIndicators?: Array<{
    sourceHandNameMatcher: string;
    referenceCycleSeconds?: number;
    indicators: Array<{
      label: string;
      startFraction: number;
      endFraction: number;
    }>;
  }>;

  epochReference: "todayLocalMidnight" | "todayUTCMidnight" | "fixedISO";
  epochFixedISO?: string;
  epochTimezone?: string;
  theme: {
    frameColor: string;
    backgroundColor: string;
    textColor: string;
    tickColor: string;
    minorTickColor?: string;
    centerDotColor: string;
  };
  hands: ClockHandConfig[];
}

interface ClockCanvasProps {
  config: ClockConfig;
}

const getEpochStartTimestamp = (config: ClockConfig): number => {
  if (config.epochFixedISO && config.epochTimezone) {
    // Parse the ISO string in the specified timezone
    const dt = DateTime.fromISO(config.epochFixedISO, {
      zone: config.epochTimezone,
    });
    return dt.toMillis();
  }

  // Default to today at midnight in the selected timezone (or local if not specified)
  const timezone = config.epochTimezone || DateTime.local().zoneName;
  return DateTime.now().setZone(timezone).startOf("day").toMillis();
};

const ClockCanvas: React.FC<ClockCanvasProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[ClockCanvas] Failed to get 2D context.");
      return;
    }

    if (!config || !config.theme || !config.hands) {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "Invalid Clock Config",
          canvas.width / 2,
          canvas.height / 2,
        );
      }
      return;
    }
    const drawHand = (
      currentCtx: CanvasRenderingContext2D,
      centerX: number,
      centerY: number,
      mainDrawRadius: number,
      angle: number,
      handCfg: ClockHandConfig,
    ) => {
      currentCtx.save();
      currentCtx.beginPath();
      currentCtx.translate(centerX, centerY);
      currentCtx.rotate(angle);

      currentCtx.moveTo(0, 0);
      currentCtx.lineTo(0, -mainDrawRadius * handCfg.length);

      currentCtx.strokeStyle = handCfg.color;
      const baseHandWidth = Math.max(1, mainDrawRadius * 0.03);
      currentCtx.lineWidth = baseHandWidth * (handCfg.widthFactor || 1);
      currentCtx.lineCap = "round";
      currentCtx.stroke();
      currentCtx.restore();
    };

    const drawTicksAndNumbers = (
      currentCtx: CanvasRenderingContext2D,
      centerX: number,
      centerY: number,
      drawRadius: number,
      divisions: number,
      showNumbersFlag: boolean,
      pTextColor: string,
      pTickColor: string,
      minorTicks: number = 0,
      pMinorTickColor?: string,
      isInner: boolean = false,
      mainClockRadiusForScaling: number,
    ) => {
      const effectiveTextColor = pTextColor || config.theme.textColor;
      const effectiveTickColor = pTickColor || config.theme.tickColor;
      const effectiveMinorTickColor =
        pMinorTickColor || config.theme.minorTickColor || effectiveTickColor;

      const tickStartFactor = showNumbersFlag ? 0.88 : 0.92;
      const tickEndFactor = 1.0;
      const numberRadiusFactor = 0.75;
      const minorTickStartFactor = 0.94;
      const minorTickEndFactor = 1.0;

      const fontSize = Math.max(
        8,
        Math.floor(
          mainClockRadiusForScaling *
            (isInner ? config.innerScale.numberFontSizeFactor || 0.06 : 0.1),
        ),
      );

      for (let i = 0; i < divisions; i++) {
        const angle = (i * 2 * Math.PI) / divisions - Math.PI / 2;

        currentCtx.beginPath();
        currentCtx.moveTo(
          centerX + drawRadius * tickStartFactor * Math.cos(angle),
          centerY + drawRadius * tickStartFactor * Math.sin(angle),
        );
        currentCtx.lineTo(
          centerX + drawRadius * tickEndFactor * Math.cos(angle),
          centerY + drawRadius * tickEndFactor * Math.sin(angle),
        );
        currentCtx.strokeStyle = effectiveTickColor;
        currentCtx.lineWidth = Math.max(
          1,
          mainClockRadiusForScaling * (isInner ? 0.01 : 0.018),
        );
        currentCtx.stroke();

        if (showNumbersFlag) {
          currentCtx.font = `${fontSize}px Arial`;
          currentCtx.fillStyle = effectiveTextColor;
          currentCtx.textAlign = "center";
          currentCtx.textBaseline = "middle";

          let numToDisplay = i.toString();
          if (!isInner && divisions === 12) {
            numToDisplay = i === 0 ? "12" : i.toString();
          } else if (
            isInner &&
            config.innerScale.divisions === 60 &&
            divisions === 60
          ) {
            if (i % 5 === 0) {
              numToDisplay = i.toString();
            } else {
              numToDisplay = "";
            }
          } else if (!isInner && divisions === 10) {
            numToDisplay = i.toString();
          }

          if (numToDisplay) {
            currentCtx.fillText(
              numToDisplay,
              centerX + drawRadius * numberRadiusFactor * Math.cos(angle),
              centerY + drawRadius * numberRadiusFactor * Math.sin(angle),
            );
          }
        }

        if (minorTicks > 0) {
          for (let j = 1; j <= minorTicks; j++) {
            const minorAngle =
              angle + (j * 2 * Math.PI) / (divisions * (minorTicks + 1));
            currentCtx.beginPath();
            currentCtx.moveTo(
              centerX +
                drawRadius * minorTickStartFactor * Math.cos(minorAngle),
              centerY +
                drawRadius * minorTickStartFactor * Math.sin(minorAngle),
            );
            currentCtx.lineTo(
              centerX + drawRadius * minorTickEndFactor * Math.cos(minorAngle),
              centerY + drawRadius * minorTickEndFactor * Math.sin(minorAngle),
            );
            currentCtx.strokeStyle = effectiveMinorTickColor;
            currentCtx.lineWidth = Math.max(
              0.5,
              mainClockRadiusForScaling * (isInner ? 0.005 : 0.008),
            );
            currentCtx.stroke();
          }
        }
      }
    };

    const drawClockContents = () => {
      if (!canvas || !ctx) return;
      const { width, height } = canvas;

      const overallRadius = (Math.min(width, height) / 2) * 0.95;
      const digitalDisplayHeight = config.showDigitalDisplay
        ? Math.max(20, overallRadius * 0.2)
        : 0;
      const clockAreaClientHeight = height - digitalDisplayHeight;
      const clockAreaRadius =
        (Math.min(width, clockAreaClientHeight) / 2) * 0.92;

      const clockCenterX = width / 2;
      const clockCenterY = clockAreaClientHeight / 2;

      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.arc(clockCenterX, clockCenterY, clockAreaRadius, 0, 2 * Math.PI);
      ctx.fillStyle = config.theme.backgroundColor;
      ctx.fill();
      ctx.strokeStyle = config.theme.frameColor;
      ctx.lineWidth = Math.max(1, clockAreaRadius * 0.025);
      ctx.stroke();

      drawTicksAndNumbers(
        ctx,
        clockCenterX,
        clockCenterY,
        clockAreaRadius,
        config.divisions,
        config.showNumbers,
        config.theme.textColor,
        config.theme.tickColor,
        config.minorTicksPerDivision,
        config.theme.minorTickColor,
        false,
        clockAreaRadius,
      );

      if (config.innerScale.show) {
        const innerRadius =
          clockAreaRadius *
          Math.max(0.1, Math.min(0.9, config.innerScale.radiusFactor));
        drawTicksAndNumbers(
          ctx,
          clockCenterX,
          clockCenterY,
          innerRadius,
          config.innerScale.divisions,
          config.innerScale.showNumbers,
          config.innerScale.numberColor || config.theme.textColor,
          config.innerScale.tickColor || config.theme.tickColor,
          0,
          true,
          clockAreaRadius,
        );
      }

      const epochStartTimeMs = getEpochStartTimestamp(config);
      const systemTimeNow = new Date();
      const currentTimeMs = systemTimeNow.getTime();
      const elapsedSecondsSinceEpoch =
        (currentTimeMs - epochStartTimeMs) / 1000;

      let digitalDisplayValues: {
        name: string;
        value: string;
        handConfig: ClockHandConfig;
      }[] = [];

      (config.hands || []).forEach((handCfg) => {
        if (handCfg.cycleDurationSeconds <= 0) {
          console.warn(
            `[ClockHands] Invalid cycleDurationSeconds (${handCfg.cycleDurationSeconds}) for hand ${handCfg.name}. Skipping.`,
          );
          return;
        }

        let currentCycleValue =
          elapsedSecondsSinceEpoch / handCfg.cycleDurationSeconds;
        if (!handCfg.smooth) {
          const scaleDivisions =
            handCfg.useInnerScale && config.innerScale.show
              ? config.innerScale.divisions
              : config.divisions;

          if (scaleDivisions > 0) {
            const discreteProgress =
              Math.floor((currentCycleValue % 1) * scaleDivisions) /
              scaleDivisions;
            const fullCycles = Math.floor(currentCycleValue);
            currentCycleValue = fullCycles + discreteProgress;
          }
        }

        const angleFraction = currentCycleValue % 1;
        const angleForHand_0_Right = angleFraction * 2 * Math.PI;
        const finalAngleForDraw_0_Up = angleFraction * 2 * Math.PI;

        drawHand(
          ctx,
          clockCenterX,
          clockCenterY,
          clockAreaRadius,
          finalAngleForDraw_0_Up,
          handCfg,
        );

        if (config.showDigitalDisplay && handCfg.showValueDigitally) {
          const angleFraction = currentCycleValue % 1;
          let valueForDisplay: number;
          let numDecimalPlaces = 0;

          if (handCfg.smooth) {
            numDecimalPlaces = 1;
          }

          const handNameLower = handCfg.name.toLowerCase();

          if (handNameLower.includes("hour")) {
            const hourCycleBase = config.divisions;
            valueForDisplay = angleFraction * hourCycleBase;

            if (!handCfg.smooth) valueForDisplay = Math.floor(valueForDisplay);
          } else if (handNameLower.includes("minute")) {
            valueForDisplay = angleFraction * 60;
            if (!handCfg.smooth) valueForDisplay = Math.floor(valueForDisplay);
          } else if (handNameLower.includes("second")) {
            valueForDisplay = angleFraction * 60;

            if (!handCfg.smooth) valueForDisplay = Math.floor(valueForDisplay);
            else numDecimalPlaces = 1;
          } else {
            const scaleForValue =
              handCfg.useInnerScale && config.innerScale.show
                ? config.innerScale.divisions
                : config.divisions;
            valueForDisplay = angleFraction * scaleForValue;
            if (!handCfg.smooth) valueForDisplay = Math.floor(valueForDisplay);
          }

          digitalDisplayValues.push({
            name: handCfg.name,

            value: valueForDisplay.toFixed(numDecimalPlaces),
            handConfig: handCfg,
          });
        }
      });

      ctx.beginPath();
      ctx.arc(
        clockCenterX,
        clockCenterY,
        Math.max(2, clockAreaRadius * 0.035),
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = config.theme.centerDotColor;
      ctx.fill();

      if (config.showDigitalDisplay && digitalDisplayValues.length > 0) {
        ctx.font = `${Math.max(10, Math.floor(overallRadius * 0.09))}px Arial`;
        ctx.fillStyle = config.theme.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        let formatString = config.digitalDisplayFormat;
        const hourFormat = config.digitalDisplayHourFormat || "12h"; // Default to 12h if not set

        // If no custom format string, create a default one based on hourFormat
        if (!formatString) {
          formatString = hourFormat === "24h" ? "HH:mm:ss" : "h:mm:ss A";
        }

        let resultText = formatString;

        // --- Populate placeholders ---

        // H, M, S placeholders
        const hValObj = digitalDisplayValues.find((h) =>
          h.handConfig.name.toLowerCase().includes("hour"),
        );
        const mValObj = digitalDisplayValues.find((h) =>
          h.handConfig.name.toLowerCase().includes("minute"),
        );
        const sValObj = digitalDisplayValues.find((h) =>
          h.handConfig.name.toLowerCase().includes("second"),
        );

        if (resultText.match(/H|h/i) && hValObj) {
          let hour = parseFloat(hValObj.value); // This is 0-11 or 0-23 from Phase 1 population
          let effectiveHour = hour;

          if (hourFormat === "12h") {
            if (effectiveHour >= 12) effectiveHour -= 12; // 13 -> 1, 12 -> 0
            if (effectiveHour < 1 && effectiveHour >= 0) effectiveHour += 12; // 0.xx -> 12.xx (e.g. 0 from 12am, or 0.5 from 12:30am)
            // This handles values like 0.0 (midnight) to 12.0
            // and 0.5 (half past midnight) to 12.5
          }
          // Ensure integer for non-smooth, potentially apply floor for display
          const displayHourNum = hValObj.handConfig.smooth
            ? effectiveHour
            : Math.floor(effectiveHour);

          resultText = resultText.replace(
            /HH/g,
            Math.floor(displayHourNum).toString().padStart(2, "0"),
          ); // Padded 24h
          resultText = resultText.replace(
            /H/g,
            Math.floor(displayHourNum).toString(),
          ); // Non-padded 24h
          resultText = resultText.replace(
            /hh/g,
            Math.floor(displayHourNum).toString().padStart(2, "0"),
          ); // Padded 12h
          resultText = resultText.replace(
            /h/g,
            Math.floor(displayHourNum).toString(),
          ); // Non-padded 12h
        } else if (resultText.match(/H|h/i)) {
          // No hour hand data
          resultText = resultText.replace(/H|h/gi, "-");
        }

        if (resultText.match(/m/i) && mValObj) {
          const minute = parseFloat(mValObj.value); // 0-59 from Phase 1
          const displayMinuteNum = mValObj.handConfig.smooth
            ? minute
            : Math.floor(minute);
          resultText = resultText.replace(
            /mm/g,
            Math.floor(displayMinuteNum).toString().padStart(2, "0"),
          );
          resultText = resultText.replace(
            /m/g,
            Math.floor(displayMinuteNum).toString(),
          );
        } else if (resultText.match(/m/i)) {
          resultText = resultText.replace(/m/gi, "--");
        }

        if (resultText.match(/s/i) && sValObj) {
          const second = parseFloat(sValObj.value); // 0-59 from Phase 1
          const displaySecondNum = sValObj.handConfig.smooth
            ? second
            : Math.floor(second);
          const secStr = Math.floor(displaySecondNum).toString();
          const paddedSecStr = secStr.padStart(2, "0");
          resultText = resultText.replace(/ss/g, paddedSecStr);
          resultText = resultText.replace(/s/g, secStr);
        } else if (resultText.match(/s/i)) {
          resultText = resultText.replace(/s/gi, "--");
        }

        // Cycle Indicators (e.g., AM/PM)
        if (resultText.match(/A/i) && config.digitalDisplayCycleIndicators) {
          let currentIndicatorLabel = "";
          for (const cycleDef of config.digitalDisplayCycleIndicators) {
            const sourceHand = config.hands.find((h) =>
              h.name.match(new RegExp(cycleDef.sourceHandNameMatcher, "i")),
            );
            if (sourceHand) {
              const refCycleSecs =
                cycleDef.referenceCycleSeconds ||
                sourceHand.cycleDurationSeconds;
              // Calculate progress within the reference cycle
              const progressInRefCycle =
                (elapsedSecondsSinceEpoch % refCycleSecs) / refCycleSecs;

              for (const indicator of cycleDef.indicators) {
                if (indicator.startFraction <= indicator.endFraction) {
                  // Normal range e.g. 0.0 to 0.5
                  if (
                    progressInRefCycle >= indicator.startFraction &&
                    progressInRefCycle < indicator.endFraction
                  ) {
                    currentIndicatorLabel = indicator.label;
                    break;
                  }
                } else {
                  // Wrapped range e.g. 0.75 to 0.25 (meaning 0.75 to 1.0 OR 0.0 to 0.25)
                  if (
                    (progressInRefCycle >= indicator.startFraction &&
                      progressInRefCycle < 1.0) ||
                    (progressInRefCycle >= 0.0 &&
                      progressInRefCycle < indicator.endFraction)
                  ) {
                    currentIndicatorLabel = indicator.label;
                    break;
                  }
                }
              }
              if (currentIndicatorLabel) break; // Found an indicator for this source hand type
            }
          }
          resultText = resultText.replace(/A/gi, currentIndicatorLabel);
        } else if (resultText.match(/A/i)) {
          // No indicator found or configured, remove placeholder
          resultText = resultText.replace(/A/gi, "");
        }

        // Replace other custom hand values by their name placeholder {HandName}
        digitalDisplayValues.forEach((dv) => {
          const placeholder = `{${dv.handConfig.name}}`;
          // dv.value is already calculated appropriately in Phase 1
          let valToDisplay = dv.value;
          // if you want specific formatting for these custom hands, apply here
          // e.g. if dv.handConfig.name is "MoonPhase" and dv.value is 0.5, display "Half Moon"
          resultText = resultText.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            valToDisplay,
          );
        });

        // Cleanup any remaining {placeholders}
        resultText = resultText.replace(/{[^}]+}/g, "").trim();

        ctx.fillText(
          resultText,
          clockCenterX,
          height - digitalDisplayHeight * 0.1,
        );
      }
    };

    const animate = () => {
      drawClockContents();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      const containerRect = container.getBoundingClientRect();
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      drawClockContents();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (container) resizeObserver.observe(container);

    resizeCanvas();
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
        }}
      />
    </div>
  );
};

export const ClockWidget: React.FC<WidgetProps<ClockConfig>> = ({
  id,
  config,
  onRemove,
  onConfigChange,
  onWidgetConfigure,
}) => {
  return (
    <BaseWidget
      id={id}
      title={config.name || "Clock"}
      onRemove={onRemove}
      onConfigure={onWidgetConfigure}
    >
      <ClockCanvas config={config} />
    </BaseWidget>
  );
};
