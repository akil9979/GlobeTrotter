import React, { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isConfirming?: boolean;
  variant?: "danger" | "primary";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  isConfirming = false,
  variant = "primary",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-floating transition-all border border-slate-100 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {variant === "danger" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-slate-900">
                {title}
              </h3>
              {description && (
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        {(confirmText || onConfirm) && (
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button variant="outline" onClick={onClose} disabled={isConfirming}>
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={variant === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                isLoading={isConfirming}
              >
                {confirmText || "Confirm"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
