// src/components/dashboard/GlobalSearchModal.tsx
import React from "react";
import { Modal } from "../../components/common/Modal/Modal"; // Adjust path as needed
import { DashboardModel, WidgetModel } from "./Dashboard"; // Adjust path as needed

export interface SearchResultItem {
  id: string; // Unique key for the result item (e.g., dashboard-D_ID or widget-D_ID-W_ID)
  type: "dashboard" | "widget";
  dashboardId: string;
  dashboardName: string;
  widgetId?: string;
  widgetTitle?: string;
  displayText: string; // Main text for display in the search results
  subText?: string; // Secondary text (e.g., "Widget in Dashboard X")
}

export interface NavigationTarget {
  dashboardId: string;
  widgetId?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboards: DashboardModel[]; // All dashboard data
  onNavigate: (target: NavigationTarget) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  dashboards,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsListRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm(""); // Reset search term when modal opens
      setActiveIndex(0);
      // Auto-focus input, slight delay for modal animation/rendering
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    const newResults: SearchResultItem[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    dashboards.forEach((dashboard) => {
      // Search dashboard names
      if (dashboard.name.toLowerCase().includes(lowerSearchTerm)) {
        newResults.push({
          id: `dashboard-${dashboard.id}`,
          type: "dashboard",
          dashboardId: dashboard.id,
          dashboardName: dashboard.name,
          displayText: dashboard.name,
          subText: "Dashboard",
        });
      }

      // Search widget titles (or types as fallback)
      dashboard.widgets.forEach((widget) => {
        const widgetSearchableName = widget.title || widget.type; // Prioritize title
        if (widgetSearchableName.toLowerCase().includes(lowerSearchTerm)) {
          newResults.push({
            id: `widget-${dashboard.id}-${widget.id}`,
            type: "widget",
            dashboardId: dashboard.id,
            dashboardName: dashboard.name,
            widgetId: widget.id,
            widgetTitle: widget.title || `Unnamed ${widget.type} widget`,
            displayText:
              widget.title ||
              `Unnamed ${widget.type} widget (ID: ${widget.id.slice(-4)})`,
            subText: `Widget in ${dashboard.name}`,
          });
        }
      });
    });

    setResults(newResults);
    setActiveIndex(0);
  }, [searchTerm, dashboards]);

  // Keyboard navigation for results
  React.useEffect(() => {
    if (!isOpen) return; // Only listen when modal is open

    const handleKeyDown = (event: KeyboardEvent) => {
      if (results.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
      }
    };

    // Add event listener to the window, or preferably to a modal container if possible
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex, onNavigate]); // Ensure handleSelect gets updated activeIndex

  // Scroll active item into view
  React.useEffect(() => {
    if (
      resultsListRef.current &&
      resultsListRef.current.children[activeIndex]
    ) {
      resultsListRef.current.children[activeIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const handleSelect = (item: SearchResultItem) => {
    onNavigate({
      dashboardId: item.dashboardId,
      widgetId: item.widgetId,
    });
    // onClose(); // The onNavigate handler in Dashboard.tsx will call onClose
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Search">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          minWidth: "min(90vw, 600px)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Search dashboards & widgets (Ctrl+K or Cmd+K to toggle)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 15px",
            boxSizing: "border-box",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "1rem",
          }}
        />
        {searchTerm && results.length === 0 && (
          <p style={{ textAlign: "center", color: "#777", padding: "10px 0" }}>
            No results found.
          </p>
        )}
        {results.length > 0 && (
          <ul
            ref={resultsListRef}
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              maxHeight: "60vh", // Limit height
              overflowY: "auto",
              border: "1px solid #eee",
              borderRadius: "4px",
            }}
          >
            {results.map((item, index) => (
              <li
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: "10px 15px",
                  cursor: "pointer",
                  borderBottom:
                    index < results.length - 1 ? "1px solid #eee" : "none",
                  backgroundColor:
                    index === activeIndex ? "#e9f5ff" : "transparent", // Highlight for active
                  transition: "background-color 0.1s ease-in-out",
                }}
                title={`Go to ${item.type} "${item.displayText}" ${item.type === "widget" ? `in ${item.dashboardName}` : ""}`}
              >
                <div style={{ fontWeight: "bold", color: "#333" }}>
                  {item.displayText}
                </div>
                {item.subText && (
                  <div style={{ fontSize: "0.85em", color: "#555" }}>
                    {item.subText}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
