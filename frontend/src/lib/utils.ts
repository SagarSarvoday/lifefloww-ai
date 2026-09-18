import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ActivityCategory, ActivityPriority, ActivityStatus } from "@/types/activity";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "No date set";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Invalid date";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    const dateStr = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    return `${dateStr} at ${timeStr}`;
  } catch {
    return "Invalid date";
  }
}

export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? "hour" : "hours"}`;
  return `${mins} mins`;
}

export function getCategoryBadge(category: ActivityCategory): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (category) {
    case "STUDY":
      return {
        label: "Study",
        bgClass: "bg-blue-50 dark:bg-blue-950/40",
        textClass: "text-blue-700 dark:text-blue-300",
        borderClass: "border-blue-200 dark:border-blue-800",
      };
    case "WORK":
      return {
        label: "Work",
        bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
        textClass: "text-indigo-700 dark:text-indigo-300",
        borderClass: "border-indigo-200 dark:border-indigo-800",
      };
    case "FITNESS":
      return {
        label: "Fitness",
        bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
        textClass: "text-emerald-700 dark:text-emerald-300",
        borderClass: "border-emerald-200 dark:border-emerald-800",
      };
    case "HEALTH":
      return {
        label: "Health",
        bgClass: "bg-teal-50 dark:bg-teal-950/40",
        textClass: "text-teal-700 dark:text-teal-300",
        borderClass: "border-teal-200 dark:border-teal-800",
      };
    case "PERSONAL":
      return {
        label: "Personal",
        bgClass: "bg-purple-50 dark:bg-purple-950/40",
        textClass: "text-purple-700 dark:text-purple-300",
        borderClass: "border-purple-200 dark:border-purple-800",
      };
    case "SHOPPING":
      return {
        label: "Shopping",
        bgClass: "bg-amber-50 dark:bg-amber-950/40",
        textClass: "text-amber-700 dark:text-amber-300",
        borderClass: "border-amber-200 dark:border-amber-800",
      };
    case "TRAVEL":
      return {
        label: "Travel",
        bgClass: "bg-sky-50 dark:bg-sky-950/40",
        textClass: "text-sky-700 dark:text-sky-300",
        borderClass: "border-sky-200 dark:border-sky-800",
      };
    case "APPOINTMENT":
      return {
        label: "Appointment",
        bgClass: "bg-rose-50 dark:bg-rose-950/40",
        textClass: "text-rose-700 dark:text-rose-300",
        borderClass: "border-rose-200 dark:border-rose-800",
      };
    case "FINANCE":
      return {
        label: "Finance",
        bgClass: "bg-green-50 dark:bg-green-950/40",
        textClass: "text-green-700 dark:text-green-300",
        borderClass: "border-green-200 dark:border-green-800",
      };
    case "SOCIAL":
      return {
        label: "Social",
        bgClass: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
        textClass: "text-fuchsia-700 dark:text-fuchsia-300",
        borderClass: "border-fuchsia-200 dark:border-fuchsia-800",
      };
    default:
      return {
        label: "Other",
        bgClass: "bg-slate-50 dark:bg-slate-800",
        textClass: "text-slate-700 dark:text-slate-300",
        borderClass: "border-slate-200 dark:border-slate-700",
      };
  }
}

export function getPriorityBadge(priority: ActivityPriority): {
  label: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
} {
  switch (priority) {
    case "URGENT":
      return {
        label: "Urgent",
        bgClass: "bg-red-50 dark:bg-red-950/40",
        textClass: "text-red-700 dark:text-red-300",
        dotClass: "bg-red-500",
      };
    case "HIGH":
      return {
        label: "High",
        bgClass: "bg-orange-50 dark:bg-orange-950/40",
        textClass: "text-orange-700 dark:text-orange-300",
        dotClass: "bg-orange-500",
      };
    case "MEDIUM":
      return {
        label: "Medium",
        bgClass: "bg-blue-50 dark:bg-blue-950/40",
        textClass: "text-blue-700 dark:text-blue-300",
        dotClass: "bg-blue-500",
      };
    case "LOW":
    default:
      return {
        label: "Low",
        bgClass: "bg-slate-100 dark:bg-slate-800",
        textClass: "text-slate-600 dark:text-slate-400",
        dotClass: "bg-slate-400",
      };
  }
}

export function getStatusBadge(status: ActivityStatus): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        bgClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
        textClass: "text-emerald-700",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        bgClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
        textClass: "text-rose-700",
      };
    case "PENDING":
    default:
      return {
        label: "Pending",
        bgClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
        textClass: "text-amber-700",
      };
  }
}
