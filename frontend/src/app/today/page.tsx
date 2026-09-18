"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, Plus, RefreshCw, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Activity } from "@/types/activity";
import { useApp } from "@/components/layout/AppShell";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { EditActivityModal } from "@/components/activities/EditActivityModal";
import { DeleteConfirmModal } from "@/components/activities/DeleteConfirmModal";

export default function TodayPage() {
  const { openAddModal, showToast, lastActivityUpdated, triggerRefresh } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.getTodayActivities();
      setActivities(res.data || []);
    } catch (err) {
      console.error("Error fetching today's schedule:", err);
      showToast("Failed to load today's schedule", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday, lastActivityUpdated]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchToday();
  };

  const handleActivityUpdated = (updated: Activity) => {
    showToast(`Updated "${updated.title}"`, "success");
    triggerRefresh();
  };

  const handleActivityDeleted = () => {
    showToast("Activity deleted successfully", "success");
    triggerRefresh();
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const pendingList = activities.filter((a) => a.status === "PENDING");
  const completedList = activities.filter((a) => a.status === "COMPLETED");

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
              Asia/Kolkata
            </span>
            <span className="text-xs text-slate-400">Timezone boundaries</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Today&apos;s Schedule
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openAddModal("Schedule for today at ")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition shadow-sm shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add for Today</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3 max-w-md mx-auto">
          <div className="h-12 w-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Your today agenda is clear
          </h3>
          <p className="text-xs text-slate-500">
            No activities scheduled for today yet. Use natural language to schedule tasks, workouts, or appointments.
          </p>
          <button
            onClick={() => openAddModal("Schedule cricket practice today at 5 PM")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Schedule an activity</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending tasks */}
          {pendingList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Pending ({pendingList.length})
                </h3>
              </div>
              <div className="space-y-3">
                {pendingList.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    onUpdate={handleActivityUpdated}
                    onEdit={(activity) => {
                      setEditingActivity(activity);
                      setIsEditOpen(true);
                    }}
                    onDelete={(activity) => {
                      setDeletingActivity(activity);
                      setIsDeleteOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed tasks */}
          {completedList.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400">
                Completed ({completedList.length})
              </h3>
              <div className="space-y-3">
                {completedList.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    onUpdate={handleActivityUpdated}
                    onEdit={(activity) => {
                      setEditingActivity(activity);
                      setIsEditOpen(true);
                    }}
                    onDelete={(activity) => {
                      setDeletingActivity(activity);
                      setIsDeleteOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EditActivityModal
        isOpen={isEditOpen}
        activity={editingActivity}
        onClose={() => {
          setIsEditOpen(false);
          setEditingActivity(null);
        }}
        onSuccess={handleActivityUpdated}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        activity={deletingActivity}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingActivity(null);
        }}
        onSuccess={handleActivityDeleted}
      />
    </div>
  );
}
