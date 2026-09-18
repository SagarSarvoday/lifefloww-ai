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
  onResult?: (finalTranscript: string) => void;
  onInterim?: (interimTranscript: string) => void;
  onError?: (errorMessage: string) => void;
}

export function useSpeechRecognition({
  lang = "en-US",
  onResult,
  onInterim,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManuallyStoppedRef = useRef(false);

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
      onError?.(msg);
      return;
    }

    // Reset state
    setError(null);
    setInterimText("");
    setFinalText("");
    isManuallyStoppedRef.current = false;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
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
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            newFinal += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimText(currentInterim);
          onInterim?.(currentInterim);
        }

        if (newFinal) {
          setFinalText((prev) => {
            const combined = prev ? `${prev} ${newFinal.trim()}` : newFinal.trim();
            onResult?.(combined);
            return combined;
          });
          setInterimText("");
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        let userMessage = "Speech recognition error occurred.";
        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            userMessage = "Microphone access was denied. Please allow microphone permissions in your browser.";
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
        onError?.(userMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start speech recognition.";
      setError(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [lang, onError, onInterim, onResult]);

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
    finalText,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null),
  };
}
