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
import { AddWidgetSelectorContent } from "./WidgetSelector";
import { GlobalSearchModal, NavigationTarget } from "./GlobalSearchModal";
import "./Dashboard.css";
import { entitiesApi } from "../../api/entitiesApi";
import { Entity as EntityInstance } from "../../types/entities";
import { TimerConfig } from "../../widgets/timer/TimerWidget";

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

  const [isAddWidgetSelectorOpen, setIsAddWidgetSelectorOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const grid = useRef<GridStack | null>(null);
  const widgetRoots = useRef<Map<string, ReactRoot>>(new Map());
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const [appData, setAppData] = useState<AppDataModel>(() => {
    // ... (AppData initialization logic - unchanged)
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
    // ... (unchanged)
    return appData.dashboards.find((d) => d.id === appData.currentDashboardId);
  }, [appData]);

  const processedCurrentWidgets = useMemo((): ProcessedWidgetModel[] => {
    // ... (unchanged)
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

  const handleWidgetStateChange = useCallback(
    (updatedEntity: EntityInstance) => {
      console.log("Dashboard received state change for:", updatedEntity.name);

      // This function updates the master `appData` state, which will trigger a re-render.
      setAppData((prevAppData) => {
        const dashboardIndex = prevAppData.dashboards.findIndex(
          (d) => d.id === prevAppData.currentDashboardId,
        );
        if (dashboardIndex === -1) return prevAppData;

        // Create a new dashboards array for immutability
        const newDashboards = [...prevAppData.dashboards];
        const targetDashboard = { ...newDashboards[dashboardIndex] };

        // Map over the widgets of the target dashboard to find the one to update
        targetDashboard.widgets = targetDashboard.widgets.map((widget) => {
          // We identify the widget by its name, which should match the entity name
          if (
            widget.type === "timer" &&
            widget.config.name === updatedEntity.name
          ) {
            // Construct the new, updated config from the backend entity's state
            const newConfig: TimerConfig = {
              ...widget.config, // Keep existing UI-specific config
              status: updatedEntity.attributes.status.value,
              end_time: updatedEntity.attributes.end_time?.value, // Use optional chaining as it might be null
              // Also update any other attributes that the backend might change
              duration_seconds: updatedEntity.attributes.duration_seconds.value,
            };

            console.log(`Updating widget ${widget.id} config to:`, newConfig);

            // Return a new widget object with the updated config
            return { ...widget, config: newConfig };
          }

          // For all other widgets, return them unchanged
          return widget;
        });

        // Place the updated dashboard back into the dashboards array
        newDashboards[dashboardIndex] = targetDashboard;

        // Return the new appData state
        return { ...prevAppData, dashboards: newDashboards };
      });
    },
    [],
  ); // This handler is stable and doesn't need dependencies

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
  }, []);
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
  }, [configModalState, updateCurrentDashboard]);
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
    async (type: string, config: any) => {
      const def = WIDGET_REGISTRY[type];
      if (!def || !currentDashboard) return;
      if (type === "timer") {
        console.log("Creating TIMER widget: First, creating backend entity...");
        try {
          const attributes_raw = def.getInitialCreationPayload
            ? def.getInitialCreationPayload(config)
            : config;

          const payload = {
            entity_type: "timer",
            name: config.name,
            category: "default",
            attributes_raw: attributes_raw,
          };

          const createdEntity = await entitiesApi.createEntity(payload);
          console.log(
            "Backend TIMER entity created successfully:",
            createdEntity,
          );

          const finalConfig = { ...config };
          for (const key in createdEntity.attributes) {
            finalConfig[key] = createdEntity.attributes[key].value;
          }

          const newWidgetId = getNextWidgetIdForCurrentDashboard();
          const newWidget: WidgetModel = {
            id: newWidgetId,
            title: finalConfig.name, // Use the final name
            type,
            config: finalConfig, // Use the config confirmed by the backend
            layout: { ...def.defaultLayout, autoPosition: true },
          };

          updateCurrentDashboard((d) => ({
            ...d,
            widgets: [...d.widgets, newWidget],
          }));
        } catch (error: any) {
          console.error("Failed to create backend TIMER entity:", error);
          alert(`Error creating timer on the server: ${error.message}`);
        }
      } else {
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
      }
    },
    [
      currentDashboard,
      getNextWidgetIdForCurrentDashboard,
      updateCurrentDashboard,
    ],
  );

  useEffect(() => {}, [actuallyAddWidget]);

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
      const dashboardIdForLog = currentDashboard?.id;
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
      const stableOnRemove = (idToRemove: string) => {
        updateCurrentDashboard((d) => ({
          ...d,
          widgets: d.widgets.filter((w) => w.id !== idToRemove),
        }));
        if (widgetRoots.current.has(idToRemove)) {
          const r = widgetRoots.current.get(idToRemove)!;
          widgetRoots.current.delete(idToRemove);
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

      if (widgetData.type === "timer") {
        specificProps = {
          ...specificProps,
          onStateChange: handleWidgetStateChange,
        };
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
        console.log(
          `createWidgetContent: Re-rendering existing root for ${widgetData.id} on dash ${dashboardIdForLog}.`,
        );
        widgetRoots.current.get(widgetData.id)!.render(widgetElementToRender);
      } else {
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
    [
      currentDashboard,
      updateCurrentDashboard,
      openEditWidgetConfigModal,
      handleWidgetStateChange,
    ],
  );

  const syncWidgetsToGrid = useCallback(() => {
    if (!grid.current || !currentDashboard) {
      console.warn("Cannot sync widgets: grid or dashboard not available");
      return;
    }

    console.log(
      `Syncing widgets to grid. Target: ${processedCurrentWidgets.length}. Current nodes: ${grid.current.engine.nodes.length}`,
    );

    grid.current.batchUpdate();
    const currentGsNodes = [...grid.current.engine.nodes];
    const stateWidgetsMap = new Map(
      processedCurrentWidgets.map((w) => [w.id, w]),
    );

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
      const rootsToUnmount = new Map(widgetRoots.current);
      widgetRoots.current.clear();

      console.log(
        `EFFECT_DASH_SWITCH_CLEANUP [${dashboardIdBeingCleanedUp}]: Unmounting ${rootsToUnmount.size} React roots FIRST.`,
      );
      rootsToUnmount.forEach((r, id) => r.unmount());
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
    if (!grid.current) {
      console.log(
        `MAIN_GRID_EFFECT [${effectDashboardId}]: Initializing GridStack, cols: ${targetGridColumns}`,
      );
      if (gridRef.current) {
        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: Preparing container for new grid.`,
        );
        gridRef.current.innerHTML = "";
        const actualGridDOMElement = document.createElement("div");
        actualGridDOMElement.className = "grid-stack";
        gridRef.current.appendChild(actualGridDOMElement);

        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: New inner .grid-stack div created and appended.`,
        );
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
              }, 50);
            });

            console.log(
              `MAIN_GRID_EFFECT [${effectDashboardId}]: GridStack event listeners attached.`,
            );
            syncWidgetsToGrid();
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
      if (grid.current.getColumn() !== targetGridColumns) {
        console.log(
          `MAIN_GRID_EFFECT [${effectDashboardId}]: Updating grid columns to ${targetGridColumns}`,
        );
        grid.current.column(targetGridColumns, "preserve");
      }
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
    (type: string) => {
      // This function now is called by the AddWidgetSelector modal
      openNewWidgetConfigModal(type);
    },
    [openNewWidgetConfigModal],
  );

  const handleRenameDashboard = useCallback((id: string, newName: string) => {
    if (!newName.trim()) {
      alert("Dashboard name cannot be empty.");
      return;
    }
    setAppData((prev) => ({
      ...prev,
      dashboards: prev.dashboards.map((d) =>
        d.id === id ? { ...d, name: newName.trim() } : d,
      ),
    }));
  }, []);

  const handleDeleteDashboard = useCallback((idToDelete: string) => {
    setAppData((prev) => {
      const remainingDashboards = prev.dashboards.filter(
        (d) => d.id !== idToDelete,
      );

      if (remainingDashboards.length === 0) {
        console.warn(
          "Attempted to delete the last dashboard. This should be prevented by UI.",
        );
        return prev;
      }

      let newCurrentDashboardId = prev.currentDashboardId;
      if (prev.currentDashboardId === idToDelete) {
        newCurrentDashboardId = remainingDashboards[0].id;
      }

      return {
        ...prev,
        dashboards: remainingDashboards,
        currentDashboardId: newCurrentDashboardId,
      };
    });
  }, []);

  const createADashboard = useCallback((name: string) => {
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const handleDashboardChange = useCallback(
    (dashboardId: string) => {
      // If switching dashboards, clear any pending widget focus from a previous dashboard
      if (appData.currentDashboardId !== dashboardId) {
        setFocusedWidgetId(null);
      }
      setAppData((prev) => ({ ...prev, currentDashboardId: dashboardId }));
    },
    [appData.currentDashboardId],
  );

  const handleNavigation = useCallback(
    (target: NavigationTarget) => {
      console.log("Global Search: Navigating to", target);
      if (appData.currentDashboardId !== target.dashboardId) {
        // Important: Switch dashboard first. The focusing effect will pick up focusedWidgetId.
        setFocusedWidgetId(target.widgetId || null);
        handleDashboardChange(target.dashboardId);
      } else if (target.widgetId) {
        // Already on the correct dashboard, just set the widget to focus.
        setFocusedWidgetId(target.widgetId);
      } else {
        // Navigating to a dashboard (no specific widget), clear any focused widget.
        setFocusedWidgetId(null);
      }
      setIsSearchModalOpen(false); // Close search modal
    },
    [appData.currentDashboardId, handleDashboardChange],
  ); // setFocusedWidgetId is stable

  useEffect(() => {
    if (focusedWidgetId && grid.current && currentDashboard) {
      // Ensure the widget actually exists on the *current* dashboard before trying to focus
      const widgetExistsOnCurrentDashboard =
        processedCurrentWidgetsRef.current.some(
          (w) => w.id === focusedWidgetId,
        );

      if (!widgetExistsOnCurrentDashboard) {
        console.warn(
          `Dashboard: Focused widget ${focusedWidgetId} not found on current dashboard ${currentDashboard.id}. Clearing focus.`,
        );
        setFocusedWidgetId(null);
        return;
      }

      // Delay to allow GridStack to render/finalize positions, especially after a dashboard switch.
      const focusTimer = setTimeout(() => {
        const gsNode = grid.current?.engine.nodes.find(
          (n) => n.id === focusedWidgetId,
        );
        const widgetElement = gsNode?.el as HTMLElement | undefined;

        if (widgetElement) {
          console.log(
            `Dashboard: Focusing widget ${focusedWidgetId} on dashboard ${currentDashboard.id}`,
          );
          widgetElement.scrollIntoView({ behavior: "smooth", block: "center" });

          const contentElement = widgetElement.querySelector(
            ".grid-stack-item-content",
          );
          contentElement?.classList.add("widget-highlighted-by-search");

          setTimeout(() => {
            contentElement?.classList.remove("widget-highlighted-by-search");
          }, 2500); // Highlight for 2.5 seconds
        } else {
          console.warn(
            `Dashboard: Element for focused widget ${focusedWidgetId} not found in GridStack after delay.`,
          );
        }
        setFocusedWidgetId(null); // Reset after attempting to focus/highlight
      }, 350); // Adjust delay as needed (300-500ms is usually good for post-render effects)

      return () => clearTimeout(focusTimer);
    }
  }, [focusedWidgetId, currentDashboard, processedCurrentWidgetsRef]); // Depends on processedCurrentWidgetsRef to ensure widget data is current

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
        {/* ... (Toolbar content - unchanged) ... */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <DashboardSelector
            dashboards={appData.dashboards.map((d) => ({
              id: d.id,
              name: d.name,
            }))}
            currentDashboard={appData.currentDashboardId}
            onDashboardChange={handleDashboardChange}
            onCreateDashboard={createADashboard}
            onRenameDashboard={handleRenameDashboard}
            onDeleteDashboard={handleDeleteDashboard}
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
        <button
          onClick={() => setIsSearchModalOpen(true)}
          title="Open Global Search (Ctrl+K / Cmd+K)"
          style={{
            padding: "8px 12px",
            background: "#6c757d",
            color: "white",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          Search
        </button>
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
        {/* FAB Container - Now only holds the main Add button and modals */}
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            zIndex: 20,
          }}
        >
          {/* Main FAB to open the Add Widget Modal */}
          <button
            onClick={() => setIsAddWidgetSelectorOpen(true)}
            title="Add Widget"
            style={fabStyle("#2196F3")}
          >
            <span
              style={{
                display: "inline-block",
              }}
            >
              +
            </span>
          </button>

          {/* MODAL for Adding New Widgets */}
          {isAddWidgetSelectorOpen && (
            <Modal
              isOpen={isAddWidgetSelectorOpen}
              onClose={() => setIsAddWidgetSelectorOpen(false)}
              title="Add New Widget"
            >
              <AddWidgetSelectorContent
                widgets={Object.values(WIDGET_REGISTRY)}
                onSelectWidget={(type) => {
                  addWidget(type); // Calls openNewWidgetConfigModal or actuallyAddWidget
                  setIsAddWidgetSelectorOpen(false); // Close this modal
                }}
              />
            </Modal>
          )}

          {/* MODAL for Widget Configuration (existing) */}
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

          <GlobalSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            dashboards={appData.dashboards}
            onNavigate={handleNavigation}
          />
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
  fontSize: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow:
    "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
  transition: "background-color 0.2s, box-shadow 0.2s",
});
