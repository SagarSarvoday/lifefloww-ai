"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API interface definitions
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      0: { transcript: string };
    };
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  /**
   * Called whenever a new piece of final transcript is finalized in the current session.
   * Provides the chunk of freshly finalized text.
   */
  onNewFinalSegment?: (newChunk: string) => void;
  /**
   * Called with the full accumulated final text for the current session.
   */
  onSessionFinal?: (sessionTranscript: string) => void;
  /**
   * Legacy callback for backwards compatibility: called with freshly finalized text chunk.
   */
  onResult?: (newChunk: string) => void;
  /**
   * Real-time interim transcript (currently being spoken, not yet finalized).
   */
  onInterim?: (interimTranscript: string) => void;
  /**
   * Error callback.
   */
  onError?: (errorMessage: string) => void;
}

export function useSpeechRecognition({
  lang = "en-US",
  onNewFinalSegment,
  onSessionFinal,
  onResult,
  onInterim,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [sessionFinalText, setSessionFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManuallyStoppedRef = useRef(false);

  // Keep latest callbacks in refs to avoid restarting recognition on re-renders
  const callbacksRef = useRef({
    onNewFinalSegment,
    onSessionFinal,
    onResult,
    onInterim,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewFinalSegment,
      onSessionFinal,
      onResult,
      onInterim,
      onError,
    };
  }, [onNewFinalSegment, onSessionFinal, onResult, onInterim, onError]);

  // Track the highest processed result index in the current recognition session
  const processedResultIndexRef = useRef(0);
  // Track accumulated session text in ref for consistency
  const sessionFinalTextRef = useRef("");

  // Initialize and test browser support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = "Voice recognition is not supported in this browser.";
      setError(msg);
      callbacksRef.current.onError?.(msg);
      return;
    }

    // 1. Completely reset session-specific transcript states
    setError(null);
    setInterimText("");
    setSessionFinalText("");
    sessionFinalTextRef.current = "";
    processedResultIndexRef.current = 0;
    isManuallyStoppedRef.current = false;

    // 2. Clean up any prior running instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentInterim = "";
        let newFinalChunk = "";

        // Process only results from the current recognition event
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            // Guard against duplicate processing of the same result index
            if (i >= processedResultIndexRef.current) {
              const text = result[0]?.transcript?.trim();
              if (text) {
                newFinalChunk = newFinalChunk ? `${newFinalChunk} ${text}` : text;
              }
              processedResultIndexRef.current = i + 1;
            }
          } else {
            const interimPart = result[0]?.transcript;
            if (interimPart) {
              currentInterim += interimPart;
            }
          }
        }

        // Update interim text state
        setInterimText(currentInterim);
        callbacksRef.current.onInterim?.(currentInterim);

        // If new final speech chunk arrived in this session
        if (newFinalChunk) {
          const updatedSessionFinal = sessionFinalTextRef.current
            ? `${sessionFinalTextRef.current} ${newFinalChunk}`
            : newFinalChunk;

          sessionFinalTextRef.current = updatedSessionFinal;
          setSessionFinalText(updatedSessionFinal);

          // Notify consumer with the freshly finalized segment
          callbacksRef.current.onNewFinalSegment?.(newFinalChunk);
          // Legacy support: call onResult with newFinalChunk
          callbacksRef.current.onResult?.(newFinalChunk);
          // Also provide total session text if consumer wants it
          callbacksRef.current.onSessionFinal?.(updatedSessionFinal);

          // Clear interim text when final chunk is accepted
          setInterimText("");
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        let userMessage = "Speech recognition error occurred.";
        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            userMessage =
              "Microphone access was denied. Please allow microphone permissions in your browser.";
            break;
          case "no-speech":
            userMessage = "No speech detected. Please try speaking closer to your microphone.";
            break;
          case "audio-capture":
            userMessage = "No microphone was found or microphone is busy.";
            break;
          case "network":
            userMessage = "Network error occurred during speech recognition.";
            break;
          case "aborted":
            // Normal when user stops manually, don't display error
            return;
          default:
            userMessage = `Recognition error: ${event.error}`;
        }
        setError(userMessage);
        callbacksRef.current.onError?.(userMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start speech recognition.";
      setError(msg);
      callbacksRef.current.onError?.(msg);
      setIsListening(false);
    }
  }, [lang]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors during unmount cleanup
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    sessionFinalText,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null),
  };
}
