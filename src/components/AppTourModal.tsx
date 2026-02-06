"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

interface AppTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDE_DURATIONS = [10, 15, 15, 15, 20, 15, 15, 15, 10]; // in seconds

export default function AppTourModal({ isOpen, onClose }: AppTourModalProps) {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang).appTour;
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Play voice narration
  const playVoiceNarration = useCallback((slideIndex: number) => {
    if (!synthRef.current) return;
    if (slideIndex < 0 || slideIndex >= t.slides.length) return; // Bounds check

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const voiceText = t.slides[slideIndex].voice;
    const utterance = new SpeechSynthesisUtterance(voiceText);
    
    // Try to select a female voice
    const voices = synthRef.current.getVoices();
    const targetLang = lang === "es" ? "es" : "en";
    
    // First try to find a female voice for the target language
    let selectedVoice = voices.find(
      v => (v.name.toLowerCase().includes("female") || 
            v.name.toLowerCase().includes("mujer") ||
            v.name.toLowerCase().includes("woman")) &&
           v.lang.startsWith(targetLang)
    );
    
    // Fallback to any voice for the target language
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith(targetLang));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.lang = lang === "es" ? "es-US" : "en-US"; // Use US variants for Puerto Rico
    
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [lang, t.slides]);

  // Auto-advance to next slide
  const advanceSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = prev + 1;
      if (next >= t.slides.length) {
        // Reset state and close
        setCurrentSlide(0);
        setProgress(0);
        setIsPlaying(true);
        if (synthRef.current) {
          synthRef.current.cancel();
        }
        onClose();
        return prev;
      }
      return next;
    });
  }, [t.slides.length, onClose]);

  // Handle slide change
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    // Reset progress
    setProgress(0);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;

    // Play voice narration
    playVoiceNarration(currentSlide);

    // Set timer for auto-advance
    const duration = SLIDE_DURATIONS[currentSlide] * 1000; // convert to ms
    timerRef.current = setTimeout(() => {
      advanceSlide();
    }, duration);

    // Update progress bar
    const progressInterval = 50; // update every 50ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progressPercent = (elapsed / duration) * 100;
      setProgress(Math.min(progressPercent, 100));
    }, progressInterval);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentSlide, isOpen, isPlaying, t.slides.length, playVoiceNarration, advanceSlide]);

  // Handle play/pause
  useEffect(() => {
    if (!synthRef.current) return;

    if (isPlaying && isOpen) {
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }
    } else {
      if (synthRef.current.speaking && !synthRef.current.paused) {
        synthRef.current.pause();
      }
    }
  }, [isPlaying, isOpen]);

  // Handle language change
  useEffect(() => {
    // When language changes, stop current narration
    // New narration will start on next slide
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, [lang]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, [isOpen]);

  const handleClose = () => {
    setCurrentSlide(0);
    setProgress(0);
    setIsPlaying(true);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    onClose();
  };

  const handleNext = () => {
    if (currentSlide < t.slides.length - 1) {
      // Clear existing timers before navigating
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setCurrentSlide(currentSlide + 1);
      setProgress(0);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      // Clear existing timers before navigating
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setCurrentSlide(currentSlide - 1);
      setProgress(0);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative mx-4 w-full max-w-3xl rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--mp-fg)] hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
          aria-label={t.close}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Slide content */}
        <div className="px-8 pb-6 pt-12">
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-center text-2xl font-semibold leading-relaxed text-[var(--mp-fg)] sm:text-3xl">
              {t.slides[currentSlide].text}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-8 pb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full bg-[var(--mp-primary)] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-8 pb-8">
          <button
            onClick={handleBack}
            disabled={currentSlide === 0}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-5 text-sm font-medium text-[var(--mp-fg)] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.back}
          </button>

          <div className="flex items-center gap-3">
            {/* Slide indicator */}
            <span className="text-sm text-[var(--mp-muted)]">
              {currentSlide + 1} / {t.slides.length}
            </span>

            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
              aria-label={isPlaying ? t.pause : t.play}
            >
              {isPlaying ? (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlide === t.slides.length - 1}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-5 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
