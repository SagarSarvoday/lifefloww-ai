"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  Clock,
  Edit2,
  Loader2,
  Repeat,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatDateTime,
  formatDuration,
  getCategoryBadge,
  getPriorityBadge,
  getStatusBadge,
} from "@/lib/utils";
import { Activity } from "@/types/activity";

interface ActivityCardProps {
  activity: Activity;
  onUpdate: (updated: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}

export function ActivityCard({
  activity,
  onUpdate,
  onEdit,
  onDelete,
}: ActivityCardProps) {
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const isCompleted = activity.status === "COMPLETED";

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTogglingStatus) return;

    setIsTogglingStatus(true);
    const newStatus = isCompleted ? "PENDING" : "COMPLETED";

    try {
      const res = await api.updateActivity(activity.id, { status: newStatus });
      if (res.success && res.data) {
        onUpdate(res.data);
      }
    } catch (err) {
      console.error("Failed to toggle activity status:", err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const category = getCategoryBadge(activity.category);
  const priority = getPriorityBadge(activity.priority);
  const status = getStatusBadge(activity.status);
  const durationStr = formatDuration(activity.duration_minutes);

  return (
    <div
      className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-md ${
        isCompleted
          ? "border-slate-200/80 dark:border-slate-800/80 opacity-75 hover:opacity-100"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Toggle Complete Checkbox with 44px touch target */}
        <button
          onClick={handleToggleStatus}
          disabled={isTogglingStatus}
          aria-label={isCompleted ? "Mark as pending" : "Mark as completed"}
          className={`mt-0.5 h-7 w-7 sm:h-6 sm:w-6 rounded-lg flex items-center justify-center border transition-all shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-transparent"
          }`}
        >
          {isTogglingStatus ? (
            <Loader2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin text-slate-400" />
          ) : (
            <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          )}
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
            {/* Category Tag */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${category.bgClass} ${category.textClass} ${category.borderClass}`}
            >
              {category.label}
            </span>

            {/* Priority Tag */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${priority.bgClass} ${priority.textClass}`}
            >
              {priority.label}
            </span>

            {/* Status Tag */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${status.bgClass} ${status.textClass}`}
            >
              {status.label}
            </span>

            {/* Clarification Needed Tag */}
            {activity.needs_clarification && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span>Clarification Needed</span>
              </span>
            )}
          </div>

          {/* Activity Title */}
          <h4
            className={`font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate ${
              isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
            }`}
          >
            {activity.title}
          </h4>

          {/* Optional Description */}
          {activity.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Clarification prompt details if present */}
          {activity.needs_clarification && activity.clarification_question && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
              <strong>Question:</strong> {activity.clarification_question}
            </p>
          )}

          {/* Metadata Footer: Date, Duration, Recurrence, Reminder */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            {/* Start Date / Due Date */}
            {activity.start_datetime ? (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>{formatDateTime(activity.start_datetime)}</span>
              </div>
            ) : activity.due_datetime ? (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Due: {formatDateTime(activity.due_datetime)}</span>
              </div>
            ) : null}

            {/* Duration */}
            {durationStr && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{durationStr}</span>
              </div>
            )}

            {/* Recurrence Rule */}
            {activity.recurrence && activity.recurrence.frequency !== "NONE" && (
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Repeat className="h-3.5 w-3.5 shrink-0" />
                <span>{activity.recurrence.frequency.toLowerCase()}</span>
              </div>
            )}

            {/* Reminder */}
            {activity.reminder_minutes_before && (
              <div className="flex items-center gap-1 text-slate-400">
                <Bell className="h-3.5 w-3.5 shrink-0" />
                <span>{activity.reminder_minutes_before}m before</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons with 44px min touch target */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(activity)}
            aria-label="Edit activity"
            className="h-9 w-9 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          >
            <Edit2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
          <button
            onClick={() => onDelete(activity)}
            aria-label="Delete activity"
            className="h-9 w-9 sm:h-8 sm:w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          >
            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
