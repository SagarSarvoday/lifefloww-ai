"use client";

import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
} from "lucide-react";

interface SummaryCardsProps {
  total: number;
  pending: number;
  completed: number;
  todayCount: number;
  isLoading?: boolean;
}

export function SummaryCards({
  total,
  pending,
  completed,
  todayCount,
  isLoading,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Activities",
      value: total,
      icon: ListTodo,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
      borderColor: "border-indigo-100 dark:border-indigo-900/50",
    },
    {
      title: "Pending Tasks",
      value: pending,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-amber-100 dark:border-amber-900/50",
    },
    {
      title: "Completed",
      value: completed,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-emerald-100 dark:border-emerald-900/50",
    },
    {
      title: "Today's Agenda",
      value: todayCount,
      icon: CalendarDays,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-950/50",
      borderColor: "border-sky-100 dark:border-sky-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border ${card.borderColor} shadow-sm transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.title}
              </span>
              <div
                className={`h-8 w-8 rounded-xl ${card.bgColor} ${card.color} flex items-center justify-center`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {card.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
