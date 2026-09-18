"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  Lock,
  RefreshCw,
  Server,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { HealthResponse } from "@/types/activity";

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    setErrorMsg(null);
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to backend");
      setHealth({ status: "error", database: "disconnected" });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const isDbConnected = health?.database === "connected";
  const isApiOk = health?.status === "ok";

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & System Status
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Backend services, database connections, and environment configuration
        </p>
      </div>

      {/* Backend & Database Health Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                Backend Services
              </h3>
              <p className="text-xs text-slate-500">FastAPI & Supabase status</p>
            </div>
          </div>

          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
            <span>Check Connectivity</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-700 border border-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* API Status */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">FastAPI Gateway</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isApiOk ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                }`}
              />
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-white">
              {isApiOk ? "Operational (200 OK)" : "Disconnected"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              http://127.0.0.1:8000/api/v1
            </p>
          </div>

          {/* Database Status */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">Supabase PostgreSQL</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDbConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-white capitalize">
              {health ? health.database : "Checking..."}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isDbConnected ? "Session Pooler (Port 5432)" : "Awaiting DB connection"}
            </p>
          </div>
        </div>
      </div>

      {/* AI & Environment Configuration */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>AI & Timezone Settings</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Cpu className="h-4 w-4 text-slate-400" />
              <span>AI Extraction Model</span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              gpt-oss:20b (Ollama Cloud)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Application Timezone</span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Asia/Kolkata (IST +05:30)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Database className="h-4 w-4 text-slate-400" />
              <span>Persistence Layer</span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white">
              SQLAlchemy 2.x + psycopg3 async
            </span>
          </div>
        </div>
      </div>

      {/* Future Authentication Roadmap */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Lock className="h-4 w-4 text-indigo-600" />
          <span>Multi-User Authentication & Ownership (Phase 3 Roadmap)</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Currently running in single-user personal organizer mode. Future phases will introduce
          Supabase Auth (JWT / OAuth2), scoping activities by <code>user_id</code> and enabling
          push notification dispatchers.
        </p>
      </div>
    </div>
  );
}
