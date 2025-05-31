import React, { PropsWithChildren } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const Modal: React.FC<PropsWithChildren<ModalProps>> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "300px",
          maxWidth: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "5px",
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
