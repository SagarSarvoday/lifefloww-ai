"use client";

import React from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export function VoiceButton({
  isListening,
  isSupported,
  onToggle,
  className = "",
  size = "md",
  disabled = false,
}: VoiceButtonProps) {
  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs gap-1.5",
    md: "h-10 px-3.5 text-xs sm:text-sm gap-2",
    lg: "h-12 px-4 text-sm sm:text-base gap-2.5",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Speech recognition is not supported in this browser"
        aria-label="Voice input not supported"
        className={`inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed transition ${sizeClasses[size]} ${className}`}
      >
        <MicOff className={iconSizes[size]} />
        <span className="hidden sm:inline">Voice unsupported</span>
      </button>
    );
  }

  if (isListening) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label="Stop recording voice input"
        className={`relative inline-flex items-center justify-center rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30 transition-all active:scale-95 animate-pulse ${sizeClasses[size]} ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <Square className={`${iconSizes[size]} fill-white`} />
        <span>Stop</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title="Speak natural language activity"
      aria-label="Start voice input"
      className={`inline-flex items-center justify-center rounded-xl font-medium border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300 active:scale-95 transition-all shadow-sm shadow-indigo-500/10 ${sizeClasses[size]} ${className}`}
    >
      <Mic className={iconSizes[size]} />
      <span className="hidden sm:inline">Speak</span>
    </button>
  );
}
