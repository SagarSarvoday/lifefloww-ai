"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Activity } from "@/types/activity";

interface DeleteConfirmModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}

export function DeleteConfirmModal({
  activity,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !activity) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await api.deleteActivity(activity.id);
      if (res.success) {
        onSuccess(activity.id);
        onClose();
      } else {
        setErrorMessage(res.message || "Failed to delete activity.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error deleting activity.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Delete Activity?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Are you sure you want to permanently delete &ldquo;
            <span className="font-medium text-slate-700 dark:text-slate-300">{activity.title}</span>
            &rdquo;? This action cannot be undone.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
