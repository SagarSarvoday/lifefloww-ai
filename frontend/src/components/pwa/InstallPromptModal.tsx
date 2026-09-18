"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already running in standalone (installed) mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(Boolean(isStandaloneMode));
    if (isStandaloneMode) return;

    // 2. Check if user already dismissed install banner recently (within 7 days)
    const dismissedAt = localStorage.getItem("lifeflow_pwa_dismissed_at");
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return;
      }
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    if (isAppleDevice && !isStandaloneMode) {
      // Show subtle iOS banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capture Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch {
      // Prompt failed or already consumed
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("lifeflow_pwa_dismissed_at", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xl shadow-indigo-950/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                Install LifeFlow AI
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add to your home screen for quick scheduling & offline access
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-medium flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
              <span>To install on iOS:</span>
            </p>
            <p className="pl-5 text-[11px] leading-relaxed">
              1. Tap the <Share className="inline h-3.5 w-3.5 mx-0.5 text-indigo-600" /> Share button in Safari.
              <br />
              2. Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm shadow-indigo-600/25"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
