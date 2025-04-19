import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal ${className}`}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close btn btn--icon" onClick={onClose}>
            <i className="material-icons">close</i>
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
};
