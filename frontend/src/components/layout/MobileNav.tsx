"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

interface MobileNavProps {
  onOpenAddModal: () => void;
}

export function MobileNav({ onOpenAddModal }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Today", href: "/today", icon: Clock },
    { label: "All Activities", href: "/activities", icon: CalendarDays },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 dark:text-white block leading-tight">
              LifeFlow AI
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Activity Organizer</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="h-10 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm shadow-indigo-600/25 min-h-[44px] min-w-[44px] justify-center"
            aria-label="Add activity"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Add</span>
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-10 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="pt-4 pb-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 mt-3 animate-in fade-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition min-h-[44px] ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
