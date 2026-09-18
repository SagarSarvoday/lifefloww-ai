"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { AddActivityModal } from "../activities/AddActivityModal";
import { InstallPromptModal } from "../pwa/InstallPromptModal";
import { Activity } from "@/types/activity";

interface AppContextType {
  openAddModal: (initialText?: string) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  lastActivityUpdated: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType>({
  openAddModal: () => {},
  showToast: () => {},
  lastActivityUpdated: 0,
  triggerRefresh: () => {},
});

export const useApp = () => useContext(AppContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialText, setAddModalInitialText] = useState("");
  const [lastActivityUpdated, setLastActivityUpdated] = useState(Date.now());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Register Service Worker on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("LifeFlow AI ServiceWorker registration successful:", registration.scope);
          })
          .catch((err) => {
            console.warn("LifeFlow AI ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  const openAddModal = (initialText = "") => {
    setAddModalInitialText(initialText);
    setIsAddModalOpen(true);
  };

  const triggerRefresh = () => {
    setLastActivityUpdated(Date.now());
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleActivityAdded = (newActivity: Activity) => {
    showToast(`Activity "${newActivity.title}" scheduled successfully!`, "success");
    triggerRefresh();
  };

  return (
    <AppContext.Provider
      value={{ openAddModal, showToast, lastActivityUpdated, triggerRefresh }}
    >
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Mobile Header */}
        <MobileNav onOpenAddModal={() => openAddModal()} />

        {/* Desktop Sidebar */}
        <Sidebar onOpenAddModal={() => openAddModal()} />

        {/* Main Content Area with safe bottom padding for mobile browsers */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {children}
        </main>

        {/* Global Add Activity Modal */}
        <AddActivityModal
          isOpen={isAddModalOpen}
          initialText={addModalInitialText}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleActivityAdded}
        />

        {/* PWA Install Prompt Banner / Modal */}
        <InstallPromptModal />

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div
              className={`px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 ${
                toast.type === "success"
                  ? "bg-slate-900 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                  : "bg-rose-600 text-white border-rose-700"
              }`}
            >
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
