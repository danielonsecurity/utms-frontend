// src/components/WidgetSelector.tsx (or wherever you placed it)

import React, { useState, useMemo } from "react";
import { WidgetDefinition } from "../widgets"; // Adjust path as needed to your WIDGET_REGISTRY and definitions

// Make sure this interface is also exported if other components might need it,
// or if you want to be explicit, though Dashboard.tsx itself doesn't directly use this type for its state.
export interface AddWidgetSelectorContentProps {
  widgets: WidgetDefinition[];
  onSelectWidget: (type: string) => void;
}

export const AddWidgetSelectorContent: React.FC<
  AddWidgetSelectorContentProps
> = ({ widgets, onSelectWidget }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWidgets = useMemo(() => {
    if (!searchTerm.trim()) return widgets;
    return widgets.filter(
      (widget) =>
        widget.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.type.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [widgets, searchTerm]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search widgets by name or type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 15px",
          marginBottom: "20px",
          boxSizing: "border-box",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "1rem",
        }}
      />
      {filteredWidgets.length === 0 && (
        <p style={{ textAlign: "center", color: "#777" }}>
          No widgets found matching your search.
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "16px",
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "5px",
        }}
      >
        {filteredWidgets.map((def) => (
          <button
            key={def.type}
            onClick={() => onSelectWidget(def.type)}
            title={`Add ${def.displayName}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 8px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "center",
              backgroundColor: "#fff",
              transition:
                "box-shadow 0.2s, background-color 0.2s, transform 0.1s",
              minHeight: "110px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.backgroundColor = "#f9f9f9";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
              e.currentTarget.style.backgroundColor = "#fff";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span
              style={{ fontSize: "28px", marginBottom: "10px", color: "#333" }}
            >
              {def.icon || def.displayName.charAt(0).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#555",
                wordBreak: "break-word",
              }}
            >
              {def.displayName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
