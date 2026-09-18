"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { Activity, ActivityCategory, ActivityStatus } from "@/types/activity";
import { useApp } from "@/components/layout/AppShell";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { EditActivityModal } from "@/components/activities/EditActivityModal";
import { DeleteConfirmModal } from "@/components/activities/DeleteConfirmModal";

export default function AllActivitiesPage() {
  const { openAddModal, showToast, lastActivityUpdated, triggerRefresh } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filter & Pagination states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("start_datetime");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;

  // Modal states
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const res = await api.getActivities({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
        limit: pageSize,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setActivities(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error("Error fetching activities:", err);
      showToast("Failed to fetch activities list.", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, statusFilter, categoryFilter, sortBy, sortOrder, showToast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, lastActivityUpdated]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchActivities();
  };

  const handleActivityUpdated = (updated: Activity) => {
    showToast(`Updated "${updated.title}"`, "success");
    triggerRefresh();
  };

  const handleActivityDeleted = () => {
    showToast("Activity deleted successfully", "success");
    triggerRefresh();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Client-side quick filter on search query
  const filteredActivities = activities.filter((act) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      (act.description && act.description.toLowerCase().includes(q))
    );
  });

  const categories: ActivityCategory[] = [
    "STUDY",
    "WORK",
    "FITNESS",
    "HEALTH",
    "PERSONAL",
    "SHOPPING",
    "TRAVEL",
    "APPOINTMENT",
    "FINANCE",
    "SOCIAL",
    "OTHER",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            All Activities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {totalCount} total {totalCount === 1 ? "activity" : "activities"} in Supabase
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
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition shadow-sm shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities in this page..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filters and Sort */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="start_datetime">Start Time</option>
              <option value="created_at">Created Date</option>
              <option value="due_datetime">Due Date</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-2 max-w-sm mx-auto">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No matching activities found
          </p>
          <p className="text-xs text-slate-500">
            Try adjusting your filters or schedule a new activity.
          </p>
          {(statusFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setSearchQuery("");
                setPage(1);
              }}
              className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Showing Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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
