"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  Database,
} from "lucide-react";
import { api } from "@/lib/api";
import { HealthResponse } from "@/types/activity";

interface SidebarProps {
  onOpenAddModal: () => void;
}

export function Sidebar({ onOpenAddModal }: SidebarProps) {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        if (isMounted) setHealth(res);
      } catch {
        if (isMounted) setHealth({ status: "error", database: "disconnected" });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Today",
      href: "/today",
      icon: Clock,
    },
    {
      label: "All Activities",
      href: "/activities",
      icon: CalendarDays,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const isConnected = health?.status === "ok" && health?.database === "connected";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 shrink-0 min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 px-1">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            LifeFlow <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">AI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Activity Organizer</p>
        </div>
      </div>

      {/* Add Activity Button */}
      <button
        onClick={onOpenAddModal}
        className="mb-6 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all shadow-sm shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/30"
      >
        <Plus className="h-4 w-4" />
        <span>Add Activity</span>
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Backend & Supabase Status Indicator */}
      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Supabase DB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                  : "bg-amber-500 ring-4 ring-amber-500/20 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-500 capitalize">
              {health ? health.database : "connecting..."}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
