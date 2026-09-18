"use client";

import React, { useState } from "react";
import { ArrowRight, Sparkles, Volume2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { VoiceButton } from "@/components/voice/VoiceButton";

interface QuickAddProps {
  onQuickAdd: (text: string) => void;
}

export function QuickAdd({ onQuickAdd }: QuickAddProps) {
  const [text, setText] = useState("");

  const {
    isSupported,
    isListening,
    interimText,
    error: voiceError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: (spokenText) => {
      setText((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
    },
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }
    const combinedText = interimText ? `${text} ${interimText}`.trim() : text.trim();
    if (!combinedText) return;
    onQuickAdd(combinedText);
    setText("");
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-sm transition">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
            Quick AI Activity Scheduler
          </span>
        </div>

        {/* Live Listening Indicator */}
        {isListening && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-rose-600"></span>
            <span>Listening... Speak your activity</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Try: "Study DSA tomorrow at 6 PM for 2 hours" or "Dentist at 10 AM on Friday"...'
            aria-label="Activity schedule command"
            className="w-full px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-inner shadow-slate-100 dark:shadow-none min-h-[44px]"
          />

          {/* Interim speech preview floating bubble */}
          {interimText && (
            <div className="absolute left-3 right-3 -bottom-7 z-10 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              <Volume2 className="h-3 w-3 animate-pulse text-indigo-500" />
              <span className="truncate italic">{interimText}...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end shrink-0">
          <VoiceButton
            isListening={isListening}
            isSupported={isSupported}
            onToggle={handleVoiceToggle}
            size="md"
            className="min-h-[44px] min-w-[44px]"
          />

          <button
            type="submit"
            disabled={!text.trim() && !interimText.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm transition shadow-sm shadow-indigo-600/20 shrink-0 min-h-[44px]"
          >
            <span>Schedule</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {voiceError && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {voiceError}
        </p>
      )}
    </div>
  );
}
