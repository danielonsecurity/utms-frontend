import React, { PropsWithChildren } from "react";

export interface WidgetCoreProps {
  id: string;
  title: string;
  onRemove: (id: string) => void;
  onConfigure?: () => void;
}

export const BaseWidget: React.FC<PropsWithChildren<WidgetCoreProps>> = ({
  id,
  title,
  onRemove,
  onConfigure,
  children,
}) => {
  return (
    <div
      className="widget"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        border: "1px solid #ccc",
        borderRadius: "4px",
      }}
    >
      <div
        className="widget__header"
        style={{
          padding: "8px",
          backgroundColor: "var(--accent-color)",
          borderBottom: "1px solid #ccc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="widget__title" style={{ fontWeight: "bold" }}>
          {title}
        </span>
        <div
          className="widget__controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {onConfigure && (
            <button
              className="btn btn--icon"
              onClick={onConfigure}
              title="Configure widget"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <i className="material-icons" style={{ fontSize: "18px" }}>
                settings
              </i>{" "}
              {/* Assuming Material Icons CSS is loaded */}
            </button>
          )}
          <button
            className="btn btn--icon"
            onClick={() => onRemove(id)}
            title="Remove widget"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <i className="material-icons" style={{ fontSize: "18px" }}>
              close
            </i>{" "}
            {/* Assuming Material Icons CSS is loaded */}
          </button>
        </div>
      </div>
      <div
        className="widget__content"
        style={{
          flexGrow: 1,
          padding: "8px",
          overflow: "auto",
          position: "relative",
        }}
      >
        {" "}
        {/* Added position: relative for children */}
        {children}
      </div>
    </div>
  );
};
