"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { Activity } from "@/types/activity";
import { useApp } from "@/components/layout/AppShell";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { QuickAdd } from "@/components/dashboard/QuickAdd";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { EditActivityModal } from "@/components/activities/EditActivityModal";
import { DeleteConfirmModal } from "@/components/activities/DeleteConfirmModal";

export default function DashboardPage() {
  const { openAddModal, showToast, lastActivityUpdated, triggerRefresh } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    todayCount: 0,
  });

  // Modal editing & deletion states
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Today's activities
      const todayRes = await api.getTodayActivities();
      const todayItems = todayRes.data || [];
      setTodayActivities(todayItems);

      // 2. Fetch all / recent activities for KPIs and Recent List
      const allRes = await api.getActivities({
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      });
      const recentItems = allRes.data || [];
      setRecentActivities(recentItems);

      // 3. Fetch summary metrics
      const [pendingRes, completedRes] = await Promise.all([
        api.getActivities({ status: "PENDING", limit: 1 }),
        api.getActivities({ status: "COMPLETED", limit: 1 }),
      ]);

      setStats({
        total: allRes.total,
        pending: pendingRes.total,
        completed: completedRes.total,
        todayCount: todayRes.total,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      showToast("Failed to load dashboard data from backend.", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, lastActivityUpdated]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleActivityUpdated = (updated: Activity) => {
    showToast(`Updated "${updated.title}"`, "success");
    triggerRefresh();
  };

  const handleActivityDeleted = (deletedId: string) => {
    showToast("Activity deleted successfully", "success");
    triggerRefresh();
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getGreeting()}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {todayFormatted} • LifeFlow AI Dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition shadow-sm shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards
        total={stats.total}
        pending={stats.pending}
        completed={stats.completed}
        todayCount={stats.todayCount}
        isLoading={isLoading}
      />

      {/* Quick Add Bar */}
      <QuickAdd onQuickAdd={(text) => openAddModal(text)} />

      {/* Main Grid: Today's Schedule + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activities Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                Today&apos;s Schedule
              </h3>
            </div>
            <Link
              href="/today"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View all today →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : todayActivities.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-2.5">
              <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No activities scheduled for today
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Type an activity like &ldquo;Cricket practice today at 5 PM&rdquo; in the box above.
              </p>
              <button
                onClick={() => openAddModal("Schedule practice today at 5 PM")}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Schedule something</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayActivities.map((act) => (
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
          )}
        </div>

        {/* Recent Activities Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                Recent Activities
              </h3>
            </div>
            <Link
              href="/activities"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View all ({stats.total}) →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No activities yet
              </p>
              <p className="text-xs text-slate-400">
                Add your first activity using natural language.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((act) => (
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
          )}
        </div>
      </div>

      {/* Edit Activity Modal */}
      <EditActivityModal
        isOpen={isEditOpen}
        activity={editingActivity}
        onClose={() => {
          setIsEditOpen(false);
          setEditingActivity(null);
        }}
        onSuccess={handleActivityUpdated}
      />

      {/* Delete Confirmation Modal */}
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
