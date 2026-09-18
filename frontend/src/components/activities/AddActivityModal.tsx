"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  Repeat,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, getCategoryBadge, getPriorityBadge } from "@/lib/utils";
import { Activity, ActivityExtraction } from "@/types/activity";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { VoiceButton } from "@/components/voice/VoiceButton";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newActivity: Activity) => void;
  initialText?: string;
}

export function AddActivityModal({
  isOpen,
  onClose,
  onSuccess,
  initialText = "",
}: AddActivityModalProps) {
  const [inputText, setInputText] = useState(initialText);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ActivityExtraction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isSupported,
    isListening,
    interimText,
    error: voiceError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: (spokenText) => {
      setInputText((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
    },
  });

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  if (!isOpen) return null;

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleParse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) {
      stopListening();
    }
    const trimmed = (interimText ? `${inputText} ${interimText}` : inputText).trim();
    if (!trimmed) {
      setErrorMessage("Please enter or speak an activity command.");
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const response = await api.parseActivity(trimmed);
      if (response.success && response.data) {
        setParsedData(response.data);
        setStep("preview");
      } else {
        setErrorMessage(response.error || response.detail || "Failed to parse activity.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error parsing activity command.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = async () => {
    const textToSave = inputText.trim();
    if (isSaving || !textToSave) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await api.createActivity(textToSave);
      if (response.success && response.data) {
        onSuccess(response.data);
        handleClose();
      } else {
        setErrorMessage(response.error || response.detail || "Failed to save activity to database.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Database error while saving activity.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }
    setInputText("");
    setStep("input");
    setParsedData(null);
    setErrorMessage(null);
    onClose();
  };

  const quickPrompts = [
    "Study DSA tomorrow at 6 PM for 2 hours",
    "Dentist appointment on Friday at 10 AM",
    "Add gym every Monday, Wednesday and Friday at 7 AM",
    "Call mom in 30 minutes",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                {step === "input" ? "Add Activity with AI" : "Review & Confirm"}
              </h3>
              <p className="text-xs text-slate-500">
                {step === "input" ? "Speak or type naturally" : "Verify extracted schedule"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {step === "input" ? (
            <form onSubmit={handleParse} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Activity Description
                  </label>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                      Listening...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g. Remind me to finish project report tomorrow at 5 PM for 2 hours..."
                    rows={4}
                    aria-label="Activity command text"
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition min-h-[100px]"
                    autoFocus
                  />

                  {/* Interim recognition overlay */}
                  {interimText && (
                    <div className="mt-1.5 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 animate-pulse shrink-0 text-indigo-600" />
                      <span className="italic truncate">{interimText}...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Error notice */}
              {voiceError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400">
                  {voiceError}
                </div>
              )}

              {/* Quick suggestions */}
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                  Try an example:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInputText(prompt)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 transition text-left"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <VoiceButton
                  isListening={isListening}
                  isSupported={isSupported}
                  onToggle={handleVoiceToggle}
                  size="md"
                  className="min-h-[44px]"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isParsing || (!inputText.trim() && !interimText.trim())}
                    className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-sm shadow-indigo-600/20 min-h-[44px]"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Parsing with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Parse with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            parsedData && (
              <div className="space-y-4">
                {/* Ambiguity Alert Banner */}
                {parsedData.needs_clarification && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-semibold">Clarification Needed</p>
                      <p className="mt-0.5">{parsedData.clarification_question}</p>
                    </div>
                  </div>
                )}

                {/* Editable Natural Language Input Bar */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Source Command
                  </label>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Extracted Details Preview Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Title
                    </span>
                    <h4 className="font-semibold text-base text-slate-900 dark:text-white">
                      {parsedData.title}
                    </h4>
                    {parsedData.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {parsedData.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    {/* Category Badge */}
                    {(() => {
                      const cat = getCategoryBadge(parsedData.category);
                      return (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md border font-medium ${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}
                        >
                          {cat.label}
                        </span>
                      );
                    })()}

                    {/* Priority Badge */}
                    {(() => {
                      const pri = getPriorityBadge(parsedData.priority);
                      return (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md font-medium ${pri.bgClass} ${pri.textClass}`}
                        >
                          {pri.label} Priority
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                    {parsedData.start_datetime && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Starts: {formatDateTime(parsedData.start_datetime)}</span>
                      </div>
                    )}

                    {parsedData.duration_minutes !== null &&
                      parsedData.duration_minutes !== undefined && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>Duration: {formatDuration(parsedData.duration_minutes)}</span>
                        </div>
                      )}

                    {parsedData.recurrence && parsedData.recurrence.frequency !== "NONE" && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Repeat className="h-4 w-4 text-indigo-500" />
                        <span>
                          Recurs: {parsedData.recurrence.frequency}
                          {parsedData.recurrence.days_of_week &&
                            parsedData.recurrence.days_of_week.length > 0 &&
                            ` (${parsedData.recurrence.days_of_week.join(", ")})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span>
                      Confidence: {Math.round((parsedData.confidence ?? 1) * 100)}%
                    </span>
                    <span>Status: {parsedData.status || "PENDING"}</span>
                  </div>
                </div>

                {/* Confirm Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition min-h-[44px]"
                  >
                    Edit Command
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-sm shadow-emerald-600/20 min-h-[44px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Confirm & Schedule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
