import React, { useState, ChangeEvent, useEffect } from "react";

interface DashboardItem {
  id: string;
  name: string;
}

interface DashboardSelectorProps {
  dashboards: DashboardItem[];
  currentDashboard: string;
  onDashboardChange: (dashboardId: string) => void;
  onCreateDashboard: (name: string) => void;
  onRenameDashboard: (id: string, newName: string) => void;
  onDeleteDashboard: (id: string) => void;
}

export const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  dashboards,
  currentDashboard,
  onDashboardChange,
  onCreateDashboard,
  onRenameDashboard,
  onDeleteDashboard,
}) => {
  const [newDashboardName, setNewDashboardName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const currentDashboardObject = dashboards.find(
    (d) => d.id === currentDashboard,
  );

  useEffect(() => {
    if (currentDashboardObject && isRenaming) {
      setRenameValue(currentDashboardObject.name);
    }
    // If not renaming, or current dashboard changes, turn off renaming mode
    if (!isRenaming && renameValue !== (currentDashboardObject?.name || "")) {
      setIsRenaming(false);
    }
  }, [currentDashboardObject, isRenaming]);

  const handleCreate = () => {
    if (newDashboardName.trim()) {
      onCreateDashboard(newDashboardName.trim());
      setNewDashboardName("");
    } else {
      alert("New dashboard name cannot be empty.");
    }
  };

  const startRename = () => {
    if (currentDashboardObject) {
      setRenameValue(currentDashboardObject.name);
      setIsRenaming(true);
    }
  };

  const handleRenameConfirm = () => {
    if (currentDashboard && renameValue.trim()) {
      onRenameDashboard(currentDashboard, renameValue.trim());
      setIsRenaming(false);
    } else {
      alert("Dashboard name cannot be empty.");
    }
  };

  const cancelRename = () => {
    setIsRenaming(false);
    if (currentDashboardObject) {
      setRenameValue(currentDashboardObject.name);
    }
  };

  const handleDelete = () => {
    if (dashboards.length <= 1) {
      alert("Cannot delete the last dashboard.");
      return;
    }
    if (
      currentDashboardObject &&
      window.confirm(
        `Are you sure you want to delete dashboard "${currentDashboardObject.name}"? This action cannot be undone.`,
      )
    ) {
      onDeleteDashboard(currentDashboard);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <label htmlFor="dashboard-select" style={{ fontWeight: "bold" }}>
        Dashboard:
      </label>
      <select
        id="dashboard-select"
        value={currentDashboard}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          setIsRenaming(false); // Cancel rename if dashboard changes
          onDashboardChange(e.target.value);
        }}
        style={{ padding: "8px", minWidth: "200px", marginRight: "10px" }}
      >
        {dashboards.map((dashboard) => (
          <option key={dashboard.id} value={dashboard.id}>
            {dashboard.name}
          </option>
        ))}
      </select>

      {isRenaming ? (
        <>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New name"
            style={{ padding: "8px" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
          />
          <button
            onClick={handleRenameConfirm}
            style={{
              padding: "8px 12px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Save Name
          </button>
          <button
            onClick={cancelRename}
            style={{
              padding: "8px 12px",
              background: "#f44336",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        currentDashboardObject && (
          <>
            <button
              onClick={startRename}
              style={{
                padding: "8px 12px",
                background: "#007bff",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
              title="Rename current dashboard"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
              disabled={dashboards.length <= 1}
              style={{
                padding: "8px 12px",
                background: dashboards.length <= 1 ? "#ccc" : "#f44336",
                color: "white",
                border: "none",
                cursor: dashboards.length <= 1 ? "not-allowed" : "pointer",
              }}
              title={
                dashboards.length <= 1
                  ? "Cannot delete the last dashboard"
                  : "Delete current dashboard"
              }
            >
              Delete
            </button>
          </>
        )
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginLeft: "auto",
          paddingLeft: "20px",
        }}
      >
        <input
          type="text"
          value={newDashboardName}
          onChange={(e) => setNewDashboardName(e.target.value)}
          placeholder="New dashboard name"
          style={{ padding: "8px" }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          style={{
            padding: "8px 12px",
            background: "#28a745",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Create Dashboard
        </button>
      </div>
    </div>
  );
};
