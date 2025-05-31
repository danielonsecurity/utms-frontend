import { registerWidget } from "./registry";
import { clockWidgetDefinition } from "../components/widgets/ClockWidget/ClockWidgetDefinition";
import { timerWidgetDefinition } from "../components/widgets/TimerWidget/TimerWidgetDefinition";
import { timelineWidgetDefinition } from "../components/widgets/TimelineWidget/TimelineWidgetDefinition";
import { habitTrackerWidgetDefinition } from "../components/widgets/HabitTrackerWidget/HabitTrackerWidgetDefinition";
import { sleepTrackerWidgetDefinition } from "../components/widgets/SleepTrackerWidget/SleepTrackerWidgetDefinition";
import { focusStreamWidgetDefinition } from "../components/widgets/FocusStreamWidget/FocusStreamWidgetDefinition";
import { contextSwitcherWidgetDefinition } from "../components/widgets/ContextSwitcherWidget/ContextSwitcherWidgetDefinition";

registerWidget(clockWidgetDefinition);
registerWidget(timerWidgetDefinition);
registerWidget(timelineWidgetDefinition);
registerWidget(habitTrackerWidgetDefinition);
registerWidget(sleepTrackerWidgetDefinition);
registerWidget(focusStreamWidgetDefinition);
registerWidget(contextSwitcherWidgetDefinition);

export { WIDGET_REGISTRY } from "./registry";
