import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { DashboardSelector } from "./DashboardSelector";
import { createRoot, Root as ReactRoot } from "react-dom/client";
import "../../widgets";
import { WIDGET_REGISTRY, WidgetDefinition } from "../../widgets";
import { Modal } from "../../components/common/Modal/Modal";

const MIN_COLUMNS = 12;
const MAX_COLUMNS = 50;
const COLUMN_WIDTH = 50;
const MARGIN = 10;

interface WidgetLayout {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  autoPosition?: boolean;
}
interface WidgetModel {
  id: string;
  title: string;
  type: string;
  config?: any;
  layout: WidgetLayout;
}
interface DashboardModel {
  id: string;
  name: string;
  settings: { columnCount: number };
  widgets: WidgetModel[];
}
interface AppDataModel {
  dashboards: DashboardModel[];
  currentDashboardId: string;
}

interface ConfigModalState {
  isOpen: boolean;
  widgetId: string | null;
  widgetType: string | null;
  currentConfig: any | null;
  isNewWidget: boolean;
}
const getDefaultAppData = (): AppDataModel => ({
  dashboards: [
    {
      id: "default",
      name: "Default Dashboard",
      settings: { columnCount: MIN_COLUMNS },
      widgets: [],
    },
  ],
  currentDashboardId: "default",
});

interface ProcessedWidgetModel extends WidgetModel {
  config: any;
}

export const Dashboard = () => {
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    console.log(
      `%cDASHBOARD MOUNTED (Instance: ${instanceIdRef.current})`,
      "color: green; font-weight: bold;",
    );
    return () => {
      console.log(
        `%cDASHBOARD UNMOUNTED (Instance: ${instanceIdRef.current})`,
        "color: red; font-weight: bold;",
      );
    };
  }, []);

  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const grid = useRef<GridStack | null>(null);
  const widgetRoots = useRef<Map<string, ReactRoot>>(new Map());
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const [appData, setAppData] = useState<AppDataModel>(() => {
    console.log("useState: Initializing AppData");
    const saved = localStorage.getItem("dashboard-data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppDataModel;
        if (
          !parsed.dashboards ||
          parsed.dashboards.length === 0 ||
          !parsed.currentDashboardId ||
          !parsed.dashboards.find((d) => d.id === parsed.currentDashboardId)
        ) {
          console.warn(
            "Saved AppData is invalid or currentDashboardId is missing/invalid, using default.",
          );
          return getDefaultAppData();
        }
        parsed.dashboards = parsed.dashboards.map((d) => ({
          ...d,
          settings: d.settings || { columnCount: MIN_COLUMNS },
          widgets: (d.widgets || []).map((w) => ({
            ...w,
            type: w.type as string, // Ensure type consistency
            layout: w.layout || { w: 6, h: 6, autoPosition: true },
          })),
        }));
        return parsed;
      } catch (e) {
        console.error(
          "Failed to parse AppData from localStorage, using default.",
          e,
        );
        return getDefaultAppData();
      }
    }
    return getDefaultAppData();
  });

  const currentDashboard = useMemo((): DashboardModel | undefined => {
    return appData.dashboards.find((d) => d.id === appData.currentDashboardId);
  }, [appData]);

  const processedCurrentWidgets = useMemo((): ProcessedWidgetModel[] => {
    if (!currentDashboard) {
      console.log(
        "processedCurrentWidgets: No currentDashboard, returning empty array.",
      );
      return [];
    }
    console.log(
      `processedCurrentWidgets: Processing for dashboard ${currentDashboard.id}, ${currentDashboard.widgets.length} widgets.`,
    );
    return currentDashboard.widgets
      .map((widget): ProcessedWidgetModel | null => {
        const definition = WIDGET_REGISTRY[widget.type];
        if (!definition) {
          console.error(
            `No widget definition found for type "${widget.type}" (ID: ${widget.id}). Skipping.`,
          );
          return null;
        }
        try {
          const processedConfig = definition.sanitizeConfig(
            widget.config,
            widget.id,
            widget.title,
          );
          return { ...widget, config: processedConfig };
        } catch (error) {
          console.error(
            `Error sanitizing config for widget ${widget.id} (type ${widget.type}):`,
            error,
          );
          return {
            ...widget,
            config: definition.defaultConfig,
            title: `${widget.title} (Error processing config)`,
          };
        }
      })
      .filter((w): w is ProcessedWidgetModel => w !== null);
  }, [currentDashboard]);

  useEffect(() => {
    processedCurrentWidgetsRef.current = processedCurrentWidgets;
  }, [processedCurrentWidgets]);
  const processedCurrentWidgetsRef = useRef(processedCurrentWidgets);

  const targetGridColumns = useMemo(() => {
    return currentDashboard?.settings.columnCount || MIN_COLUMNS;
  }, [currentDashboard]);

  const [containerWidth, setContainerWidth] = useState(
    () => targetGridColumns * COLUMN_WIDTH + (targetGridColumns + 1) * MARGIN,
  );

  useEffect(() => {
    localStorage.setItem("dashboard-data", JSON.stringify(appData));
    console.log(
      "%cAppData saved to localStorage.",
      "color: blue;",
      appData.currentDashboardId,
      appData.dashboards.find((d) => d.id === appData.currentDashboardId)
        ?.widgets.length,
    );
  }, [appData]);

  useEffect(() => {
    const newPixelWidth =
      targetGridColumns * COLUMN_WIDTH + (targetGridColumns + 1) * MARGIN;
    setContainerWidth(newPixelWidth);
    console.log(
      `Container width updated for ${targetGridColumns} cols: ${newPixelWidth}px`,
    );
  }, [targetGridColumns]);

  const updateCurrentDashboard = useCallback(
    (updater: (dashboard: DashboardModel) => DashboardModel) => {
      setAppData((prevAppData) => {
        const currentDashboardIndex = prevAppData.dashboards.findIndex(
          (d) => d.id === prevAppData.currentDashboardId,
        );
        if (currentDashboardIndex === -1) return prevAppData;
        const updatedDashboards = [...prevAppData.dashboards];
        updatedDashboards[currentDashboardIndex] = updater(
          updatedDashboards[currentDashboardIndex],
        );
        return { ...prevAppData, dashboards: updatedDashboards };
      });
    },
    [],
  );

  const getNextWidgetIdForCurrentDashboard = useCallback((): string => {
    if (!currentDashboard) return "widget-0";
    let maxId = -1;
    currentDashboard.widgets.forEach((widget) => {
      const match = widget.id.match(/widget-(\d+)/);
      if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
    });
    return `widget-${maxId + 1}`;
  }, [currentDashboard]);

  const saveCurrentDashboardLayout = useCallback(() => {
    if (!grid.current || !currentDashboard) return;
    const layoutNodes = grid.current.save(false) as GridStackNode[];
    updateCurrentDashboard((dashboard) => {
      let changed = false;
      const newWidgets = dashboard.widgets.map((widget) => {
        const node = layoutNodes.find((n) => n.id === widget.id);
        if (
          node &&
          (widget.layout.x !== node.x ||
            widget.layout.y !== node.y ||
            widget.layout.w !== node.w ||
            widget.layout.h !== node.h)
        ) {
          changed = true;
          return {
            ...widget,
            layout: {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
              autoPosition: false,
            },
          };
        }
        return widget;
      });
      if (!changed && dashboard.widgets.length === layoutNodes.length) {
        console.warn("saveCurrentDashboardLayout: No layout changes detected.");
        return dashboard;
      }
      console.log(
        `Layout saved for ${dashboard.id}. Widgets affected: ${layoutNodes.length}`,
      );
      return { ...dashboard, widgets: newWidgets };
    });
  }, [currentDashboard, updateCurrentDashboard]);

  const [configModalState, setConfigModalState] = useState<ConfigModalState>({
    isOpen: false,
    widgetId: null,
    widgetType: null,
    currentConfig: null,
    isNewWidget: false,
  });
  const openNewWidgetConfigModal = useCallback((type: string) => {
    const def = WIDGET_REGISTRY[type];
    if (!def) return;
    if (!def.configComponent) {
      actuallyAddWidget(type, def.defaultConfig);
      return;
    }
    setConfigModalState({
      isOpen: true,
      widgetId: `new-${Date.now()}`,
      widgetType: type,
      currentConfig: { ...def.defaultConfig },
      isNewWidget: true,
    });
  }, []); // Removed currentDashboard from deps as actuallyAddWidget handles it.
  const openEditWidgetConfigModal = useCallback(
    (widget: ProcessedWidgetModel) => {
      const def = WIDGET_REGISTRY[widget.type];
      if (!def?.configComponent) return;
      setConfigModalState({
        isOpen: true,
        widgetId: widget.id,
        widgetType: widget.type,
        currentConfig: { ...widget.config },
        isNewWidget: false,
      });
    },
    [],
  );
  const handleFullModalConfigChange = useCallback((newFullConfig: any) => {
    setConfigModalState((prev) => ({ ...prev, currentConfig: newFullConfig }));
  }, []);
  const handleSaveWidgetConfig = useCallback(() => {
    if (!configModalState.widgetType || !configModalState.currentConfig) return;
    const def = WIDGET_REGISTRY[configModalState.widgetType];
    if (!def) return;
    const finalConfig = def.sanitizeConfig(
      configModalState.currentConfig,
      configModalState.widgetId!,
      configModalState.currentConfig.name || def.displayName,
    );
    if (configModalState.isNewWidget) {
      actuallyAddWidget(configModalState.widgetType, finalConfig);
    } else {
      updateCurrentDashboard((d) => ({
        ...d,
        widgets: d.widgets.map((w) =>
          w.id === configModalState.widgetId
            ? { ...w, config: finalConfig, title: finalConfig.name || w.title }
            : w,
        ),
      }));
    }
    setConfigModalState({
      isOpen: false,
      widgetId: null,
      widgetType: null,
      currentConfig: null,
      isNewWidget: false,
    });
  }, [configModalState, updateCurrentDashboard]); // Added updateCurrentDashboard
  const closeConfigModal = useCallback(() => {
    setConfigModalState({
      isOpen: false,
      widgetId: null,
      widgetType: null,
      currentConfig: null,
      isNewWidget: false,
    });
  }, []);
  const actuallyAddWidget = useCallback(
    (type: string, config: any) => {
      const def = WIDGET_REGISTRY[type];
      if (!def || !currentDashboard) return; // Guard against no currentDashboard
      const newWidgetId = getNextWidgetIdForCurrentDashboard();
      const title =
        config.name ||
        `${def.displayName} ${newWidgetId.match(/(\d+)$/)?.[0] || ""}`.trim();
      const newWidget: WidgetModel = {
        id: newWidgetId,
        title,
        type,
        config,
        layout: { ...def.defaultLayout, autoPosition: true },
      };
      updateCurrentDashboard((d) => ({
        ...d,
        widgets: [...d.widgets, newWidget],
      }));
    },
    [
      currentDashboard,
      getNextWidgetIdForCurrentDashboard,
      updateCurrentDashboard,
    ],
  );

  const handleWidgetLayoutChangeInternal = useCallback(() => {
    if (!grid.current?.engine) return;
    console.log("HWLCI: Saving dashboard layout.");
    saveCurrentDashboardLayout();
  }, [saveCurrentDashboardLayout]);

  const debouncedHandleWidgetLayoutChange = useCallback(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(
      handleWidgetLayoutChangeInternal,
      350,
    );
  }, [handleWidgetLayoutChangeInternal]);

  const createWidgetContent = useCallback(
    (widgetData: ProcessedWidgetModel, gridItemElement: HTMLElement) => {
      const dashboardIdForLog = currentDashboard?.id; // Capture for logs
      console.log(
        `createWidgetContent: START for ${widgetData.id} (${widgetData.title}) on dashboard ${dashboardIdForLog}`,
      );
      const contentHost = gridItemElement.querySelector<HTMLDivElement>(
        ".grid-stack-item-content",
      );
      if (!contentHost) {
        console.error(`No contentHost for ${widgetData.id}`, gridItemElement);
        return;
      }

      const definition = WIDGET_REGISTRY[widgetData.type];
      if (!definition) {
        console.error(`No definition for widget type ${widgetData.type}`);
        // If a root exists, render an error into it, otherwise create one.
        if (widgetRoots.current.has(widgetData.id)) {
          widgetRoots.current
            .get(widgetData.id)!
            .render(<div>Error: Unknown widget type "{widgetData.type}"</div>);
        } else {
          const mountPoint = document.createElement("div");
          mountPoint.style.cssText = "width:100%;height:100%;";
          contentHost.innerHTML = "";
          contentHost.appendChild(mountPoint);
          const root = createRoot(mountPoint);
          widgetRoots.current.set(widgetData.id, root);
          root.render(
            <div>Error: Unknown widget type "{widgetData.type}"</div>,
          );
        }
        return;
      }
      const WidgetComponent = definition.component;

      // Define stable callbacks for the widget
      const stableOnRemove = (idToRemove: string) => {
        updateCurrentDashboard((d) => ({
          ...d,
          widgets: d.widgets.filter((w) => w.id !== idToRemove),
        }));
        if (widgetRoots.current.has(idToRemove)) {
          const r = widgetRoots.current.get(idToRemove)!;
          widgetRoots.current.delete(idToRemove);
          // Defer unmount to avoid issues if called during another widget's render
          setTimeout(() => r.unmount(), 0);
        }
      };
      const stableOnConfigChange = (id: string, newCfg: any) => {
        updateCurrentDashboard((d) => ({
          ...d,
          widgets: d.widgets.map((w) =>
            w.id === id ? { ...w, config: newCfg } : w,
          ),
        }));
      };

      let specificProps = {};
      if (typeof definition.getSpecificProps === "function") {
        specificProps = definition.getSpecificProps(
          widgetData,
          currentDashboard,
        );
      }

      const widgetElementToRender = (
        <WidgetComponent
          id={widgetData.id}
          config={widgetData.config}
          onRemove={stableOnRemove}
          onConfigChange={(newCfg) =>
            stableOnConfigChange(widgetData.id, newCfg)
          }
          onWidgetConfigure={() => openEditWidgetConfigModal(widgetData)}
          {...specificProps}
        />
      );

      if (widgetRoots.current.has(widgetData.id)) {
        // Root exists, just re-render with new props
        console.log(
          `createWidgetContent: Re-rendering existing root for ${widgetData.id} on dash ${dashboardIdForLog}.`,
        );
        widgetRoots.current.get(widgetData.id)!.render(widgetElementToRender);
      } else {
        // Root does not exist, create it (this path is usually for the 'added' event)
        console.log(
          `createWidgetContent: Creating new root for ${widgetData.id} on dash ${dashboardIdForLog}.`,
        );
        const mountPoint = document.createElement("div");
        mountPoint.style.cssText = "width:100%;height:100%;";
        contentHost.innerHTML = "";
        contentHost.appendChild(mountPoint);
        const root = createRoot(mountPoint);
        widgetRoots.current.set(widgetData.id, root);
        root.render(widgetElementToRender);
      }
      console.log(
        `createWidgetContent: END for ${widgetData.id} on dashboard ${dashboardIdForLog}`,
      );
    },
    [currentDashboard, updateCurrentDashboard, openEditWidgetConfigModal],
  ); // Dependencies of createWidgetContent

  const syncWidgetsToGrid = useCallback(() => {
    if (!grid.current || !currentDashboard) {
      console.warn("Cannot sync widgets: grid or dashboard not available");
      return;
    }

    console.log(
      `Syncing widgets to grid. Target: ${processedCurrentWidgets.length}. Current nodes: ${grid.current.engine.nodes.length}`,
    );

    grid.current.batchUpdate();

    // Get current state of GridStack nodes
    const currentGsNodes = [...grid.current.engine.nodes];
    const currentGsNodeIds = new Set(currentGsNodes.map((n) => n.id as string));
    const stateWidgetsMap = new Map(
      processedCurrentWidgets.map((w) => [w.id, w]),
    );

    // 1. Remove widgets no longer in state
    currentGsNodes.forEach((gsNode) => {
      if (gsNode.id && !stateWidgetsMap.has(gsNode.id as string)) {
        console.log(`Removing stale widget ${gsNode.id} from DOM.`);
        if (widgetRoots.current.has(gsNode.id as string)) {
          const r = widgetRoots.current.get(gsNode.id as string)!;
          widgetRoots.current.delete(gsNode.id as string);
          r.unmount();
        }
        grid.current?.removeWidget(gsNode.el!, true, false);
      }
    });

    // 2. Add new widgets from state
    processedCurrentWidgets.forEach((widgetData) => {
      const isWidgetCurrentlyInGridDom = grid.current?.engine.nodes.find(
        (n) => n.id === widgetData.id,
      );

      if (!isWidgetCurrentlyInGridDom?.el) {
        console.log(`Adding widget ${widgetData.id} to grid.`);
        grid.current?.addWidget({
          id: widgetData.id,
          ...widgetData.layout,
        });
      } else {
        // Just update content for existing widgets
        createWidgetContent(
          widgetData,
          isWidgetCurrentlyInGridDom.el as HTMLElement,
        );
      }
    });

    grid.current.commit();
  }, [currentDashboard, processedCurrentWidgets, createWidgetContent]);

  useEffect(() => {
    const effectInstanceDashboardId = appData.currentDashboardId;
    console.log(
      `EFFECT_DASH_SWITCH_SETUP: For dashboard ID ${effectInstanceDashboardId}.`,
    );

    return () => {
      const gridInstanceToDestroy = grid.current;
      const dashboardIdBeingCleanedUp = effectInstanceDashboardId;

      console.log(
        `EFFECT_DASH_SWITCH_CLEANUP: For OUTGOING dashboard (was ${dashboardIdBeingCleanedUp}).`,
      );

      // 1. First, unmount all React roots to prevent renders to detached DOM
      const rootsToUnmount = new Map(widgetRoots.current);
      widgetRoots.current.clear();

      console.log(
        `EFFECT_DASH_SWITCH_CLEANUP [${dashboardIdBeingCleanedUp}]: Unmounting ${rootsToUnmount.size} React roots FIRST.`,
      );
      rootsToUnmount.forEach((r, id) => r.unmount());

      // 2. Then destroy GridStack with a small delay to ensure React unmounting completes
      if (gridInstanceToDestroy) {
        console.log(
          `EFFECT_DASH_SWITCH_CLEANUP [${dashboardIdBeingCleanedUp}]: Destroying GridStack instance.`,
        );
        try {
          gridInstanceToDestroy.destroy(true);
        } catch (e) {
          console.error(
            `EFFECT_DASH_SWITCH_CLEANUP [${dashboardIdBeingCleanedUp}]: Error destroying grid:`,
            e,
          );
        }
        grid.current = null;
      }
    };
  }, [appData.currentDashboardId]);

  // Replace the main grid effect with this complete version:
  useEffect(() => {
    const effectDashboardId = currentDashboard?.id;
    console.log(
      `MAIN_GRID_EFFECT: START for dashboard: ${effectDashboardId}, Widgets: ${processedCurrentWidgets.length}, Grid Exists: ${!!grid.current}`,
    );

    if (!currentDashboard || !gridRef.current) {
      console.log(
        `MAIN_GRID_EFFECT [${effectDashboardId}]: No currentDashboard or gridRef.current. Exiting.`,
      );
      return;
    }

    // Initialize GridStack if it doesn't exist
    if (!grid.current) {
      console.log(
        `MAIN_GRID_EFFECT [${effectDashboardId}]: Initializing GridStack, cols: ${targetGridColumns}`,
      );

      // Clear grid container completely before initializing a new grid
      if (gridRef.current) {
        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: Preparing container for new grid.`,
        );
        gridRef.current.innerHTML = ""; // Clear the outer container

        // Create a fresh grid container
        const actualGridDOMElement = document.createElement("div");
        actualGridDOMElement.className = "grid-stack";
        gridRef.current.appendChild(actualGridDOMElement);

        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: New inner .grid-stack div created and appended.`,
        );

        // Initialize GridStack with a small delay to ensure DOM is ready
        setTimeout(() => {
          try {
            grid.current = GridStack.init(
              {
                column: targetGridColumns,
                margin: MARGIN,
                cellHeight: 50,
                minRow: 1,
                float: true,
                disableOneColumnMode: true,
              },
              actualGridDOMElement,
            );

            console.log(
              `MAIN_GRID_EFFECT [${effectDashboardId}]: GridStack initialized.`,
            );

            // Attach event listeners after successful initialization
            grid.current.on(
              "dragstop resizestop removed",
              debouncedHandleWidgetLayoutChange,
            );

            grid.current.on("added", (event, items: GridStackNode[]) => {
              const dashboardIdForAddedHandler = currentDashboard?.id;
              const currentWidgetsAtEventTime =
                processedCurrentWidgetsRef.current;

              console.log(
                `GS_EVENT 'added' [${dashboardIdForAddedHandler}]: Fired for ${items.length} items.`,
              );

              // Use a more reliable way to render widgets with delay
              setTimeout(() => {
                items.forEach((item) => {
                  if (item.el && item.id && item.el.isConnected) {
                    const widgetData = currentWidgetsAtEventTime.find(
                      (w) => w.id === item.id,
                    );
                    if (widgetData) {
                      createWidgetContent(widgetData, item.el as HTMLElement);
                    } else {
                      console.warn(
                        `GS_EVENT 'added': No widgetData for id ${item.id}`,
                      );
                    }
                  }
                });
              }, 50); // Small delay to ensure DOM is stable
            });

            console.log(
              `MAIN_GRID_EFFECT [${effectDashboardId}]: GridStack event listeners attached.`,
            );

            // Now trigger widget sync with the newly created grid
            syncWidgetsToGrid();

            // Handle auto-positioning save
            const justAddedAndAutoPositioned = processedCurrentWidgets.some(
              (w) => w.layout.autoPosition,
            );

            if (justAddedAndAutoPositioned) {
              console.log(
                `MAIN_GRID_EFFECT [${effectDashboardId}]: Auto-positioned widgets found, queueing layout save.`,
              );
              setTimeout(handleWidgetLayoutChangeInternal, 250);
            }
          } catch (e) {
            console.error(`Error initializing GridStack:`, e);
          }
        }, 0);
      }
    } else {
      // Grid already exists, just update it
      if (grid.current.getColumn() !== targetGridColumns) {
        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: Updating grid columns to ${targetGridColumns}`,
        );
        grid.current.column(targetGridColumns, "preserve");
      }

      // Sync widgets to existing grid
      syncWidgetsToGrid();
    }

    console.log(`MAIN_GRID_EFFECT: END for dashboard: ${effectDashboardId}`);
  }, [
    currentDashboard,
    processedCurrentWidgets,
    targetGridColumns,
    syncWidgetsToGrid,
    createWidgetContent,
    debouncedHandleWidgetLayoutChange,
    handleWidgetLayoutChangeInternal,
  ]);

  useEffect(() => {
    if (grid.current) {
      console.log(
        `Container width changed to ${containerWidth}, notifying GridStack.`,
      );
      grid.current.onResize();
    }
  }, [containerWidth]);

  // Effect for full component unmount cleanup
  useEffect(() => {
    return () => {
      console.log(
        "%cDASHBOARD COMPONENT FULL UNMOUNT: Final cleanup.",
        "color: red; font-weight:bold;",
      );
      if (grid.current) {
        grid.current.destroy(true);
        grid.current = null;
      }
      widgetRoots.current.forEach((r) => r.unmount());
      widgetRoots.current.clear();
    };
  }, []);

  const addWidget = useCallback(
    (type: string) => openNewWidgetConfigModal(type),
    [openNewWidgetConfigModal],
  );
  const createADashboard = useCallback((name: string) => {
    // Renamed to avoid conflict
    const newId = `dashboard-${Date.now()}`;
    setAppData((prev) => ({
      ...prev,
      dashboards: [
        ...prev.dashboards,
        {
          id: newId,
          name,
          settings: { columnCount: MIN_COLUMNS },
          widgets: [],
        },
      ],
      currentDashboardId: newId,
    }));
  }, []);
  const handleManualColumnChange = useCallback(
    (newColumnCount: number) => {
      const numCols = Math.max(
        MIN_COLUMNS,
        Math.min(MAX_COLUMNS, newColumnCount),
      );
      updateCurrentDashboard((d) => ({
        ...d,
        settings: { ...d.settings, columnCount: numCols },
      }));
    },
    [updateCurrentDashboard],
  );
  const handleDashboardChange = useCallback((dashboardId: string) => {
    setAppData((prev) => ({ ...prev, currentDashboardId: dashboardId }));
  }, []);

  if (!currentDashboard) {
    return <div>Loading dashboard data or error...</div>;
  }

  console.log(
    `--- Dashboard Component Render (Before Return) --- Current Dashboard: ${currentDashboard.id}, Widgets: ${processedCurrentWidgets.length}`,
  );
  const ConfigEditorComponent =
    configModalState.isOpen && configModalState.widgetType
      ? WIDGET_REGISTRY[configModalState.widgetType]?.configComponent
      : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #ddd",
          background: "#f5f5f5",
          top: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <DashboardSelector
            dashboards={appData.dashboards.map((d) => ({
              id: d.id,
              name: d.name,
            }))}
            currentDashboard={appData.currentDashboardId}
            onDashboardChange={handleDashboardChange}
            onCreateDashboard={createADashboard} // Use renamed function
          />
          <div
            style={{
              marginLeft: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <label htmlFor="column-slider" style={{ whiteSpace: "nowrap" }}>
              Cols: {targetGridColumns}
            </label>
            <input
              type="range"
              id="column-slider"
              min={MIN_COLUMNS}
              max={MAX_COLUMNS}
              value={targetGridColumns}
              onChange={(e) =>
                handleManualColumnChange(parseInt(e.target.value, 10))
              }
              style={{ width: "150px" }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: "16px",
          overflowX: "auto",
          overflowY: "auto",
          position: "relative",
          minWidth: 0,
        }}
      >
        <div
          ref={gridRef}
          style={{ width: `${containerWidth}px`, minHeight: "100%" }}
        ></div>
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "center",
            gap: "16px",
            zIndex: 20,
          }}
        >
          {isSpeedDialOpen &&
            Object.values(WIDGET_REGISTRY).map((def) => (
              <button
                key={def.type}
                onClick={() => {
                  addWidget(def.type);
                  setIsSpeedDialOpen(false);
                }}
                title={`Add ${def.displayName}`}
                style={fabStyle(
                  def.icon &&
                    typeof def.icon === "string" &&
                    def.icon.startsWith("#")
                    ? def.icon
                    : `#${Math.floor(Math.random() * 16777215)
                        .toString(16)
                        .padStart(6, "0")}`,
                )}
              >
                <span role="img" aria-label={def.displayName}>
                  {def.icon || def.displayName.charAt(0)}
                </span>
              </button>
            ))}
          <button
            onClick={() => setIsSpeedDialOpen((prev) => !prev)}
            title={isSpeedDialOpen ? "Close Menu" : "Add Widget"}
            style={fabStyle(isSpeedDialOpen ? "#f44336" : "#2196F3")}
          >
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.3s ease-in-out",
                transform: isSpeedDialOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}
            >
              +
            </span>
          </button>
          {configModalState.isOpen &&
            ConfigEditorComponent &&
            configModalState.currentConfig && (
              <Modal
                isOpen={configModalState.isOpen}
                onClose={closeConfigModal}
                title={
                  configModalState.isNewWidget
                    ? `Configure New ${WIDGET_REGISTRY[configModalState.widgetType!]?.displayName}`
                    : `Edit ${configModalState.currentConfig.name || WIDGET_REGISTRY[configModalState.widgetType!]?.displayName}`
                }
              >
                <ConfigEditorComponent
                  config={configModalState.currentConfig}
                  onConfigChange={handleFullModalConfigChange}
                />
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={closeConfigModal}
                    style={{ padding: "8px 15px" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWidgetConfig}
                    style={{
                      padding: "8px 15px",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                    }}
                  >
                    {configModalState.isNewWidget
                      ? "Add Widget"
                      : "Save Changes"}
                  </button>
                </div>
              </Modal>
            )}
        </div>
      </div>
    </div>
  );
};

const fabStyle = (bgColor: string) => ({
  width: "56px",
  height: "56px",
  borderRadius: "28px",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow:
    "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
  transition: "background-color 0.2s",
});
