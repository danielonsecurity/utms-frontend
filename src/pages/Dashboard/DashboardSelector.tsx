import React, { useState } from "react";

interface DashboardSelectorProps {
  dashboards: { id: string; name: string }[];
  currentDashboard: string;
  onDashboardChange: (id: string) => void;
  onCreateDashboard: (name: string) => void;
}

export const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  dashboards,
  currentDashboard,
  onDashboardChange,
  onCreateDashboard,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDashboardName.trim()) {
      onCreateDashboard(newDashboardName.trim());
      setNewDashboardName("");
      setIsCreating(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ fontWeight: "bold" }}>Dashboard:</div>

      <select
        value={currentDashboard}
        onChange={(e) => onDashboardChange(e.target.value)}
        style={{
          padding: "6px 12px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          backgroundColor: "white",
          minWidth: "150px",
        }}
      >
        {dashboards.map((dashboard) => (
          <option key={dashboard.id} value={dashboard.id}>
            {dashboard.name}
          </option>
        ))}
      </select>

      {isCreating ? (
        <form
          onSubmit={handleCreateSubmit}
          style={{ display: "flex", gap: "8px" }}
        >
          <input
            type="text"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            placeholder="Dashboard name"
            autoFocus
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            backgroundColor: "#2196f3",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          New Dashboard
        </button>
      )}
    </div>
  );
};
