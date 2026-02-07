"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMarketingLang } from "@/lib/useMarketingLang";

interface TourSlide {
  id: string;
  title: { en: string; es: string };
  content: { en: string; es: string };
  image?: string;
}

const tourSlides: TourSlide[] = [
  {
    id: "welcome",
    title: {
      en: "Welcome to IslaPOS",
      es: "Bienvenido a IslaPOS"
    },
    content: {
      en: "The complete restaurant management system designed for modern restaurants. Fast, reliable, and easy to use.",
      es: "El sistema completo de gestión de restaurantes diseñado para restaurantes modernos. Rápido, confiable y fácil de usar."
    }
  },
  {
    id: "pos",
    title: {
      en: "Fast POS & Orders",
      es: "POS Rápido y Pedidos"
    },
    content: {
      en: "Process orders quickly with our intuitive POS interface. Support for split payments, modifiers, and table service.",
      es: "Procesa pedidos rápidamente con nuestra interfaz POS intuitiva. Soporte para pagos divididos, modificadores y servicio de mesa."
    }
  },
  {
    id: "inventory",
    title: {
      en: "Inventory & Food Cost",
      es: "Inventario y Costo de Alimentos"
    },
    content: {
      en: "Track inventory in real-time and monitor food costs. Get alerts when stock is low and reduce waste with smart ordering.",
      es: "Rastrea el inventario en tiempo real y monitorea los costos de alimentos. Recibe alertas cuando el stock es bajo y reduce el desperdicio con pedidos inteligentes."
    }
  },
  {
    id: "theoretical",
    title: {
      en: "Theoretical Food Cost",
      es: "Costo de Alimentos Teórico"
    },
    content: {
      en: "Compare actual vs theoretical food costs. Identify waste opportunities and optimize your menu profitability.",
      es: "Compara el costo real vs teórico de alimentos. Identifica oportunidades de desperdicio y optimiza la rentabilidad de tu menú."
    }
  },
  {
    id: "reports",
    title: {
      en: "Reports & Insights",
      es: "Reportes e Insights"
    },
    content: {
      en: "Make data-driven decisions with detailed reports. Sales analytics, payment methods, and peak hours analysis.",
      es: "Toma decisiones basadas en datos con reportes detallados. Análisis de ventas, métodos de pago y análisis de horas pico."
    }
  },
  {
    id: "multilang",
    title: {
      en: "Multi-language Support",
      es: "Soporte Multi-idioma"
    },
    content: {
      en: "Built for restaurants everywhere. Full support for English and Spanish throughout the entire system.",
      es: "Construido para restaurantes en todas partes. Soporte completo para inglés y español en todo el sistema."
    }
  },
  {
    id: "built",
    title: {
      en: "Built for Restaurants",
      es: "Construido para Restaurantes"
    },
    content: {
      en: "From table service to delivery, IslaPOS handles it all. Offline support, print management, and kitchen display.",
      es: "Desde el servicio de mesa hasta la entrega, IslaPOS lo maneja todo. Soporte sin conexión, gestión de impresión y pantalla de cocina."
    }
  }
];

export function AppTourModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lang } = useMarketingLang();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const slide = tourSlides[currentSlide];
  const title = slide.title[lang];
  const content = slide.content[lang];

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Get female voices
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.lang.includes(lang === 'es' ? 'es' : 'en') && 
        (voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Monica') || voice.name.includes('Karen'))
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => {
        if (isPlaying && currentSlide < tourSlides.length - 1) {
          setTimeout(() => nextSlide(), 500);
        } else {
          setIsPlaying(false);
        }
      };

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [lang, isPlaying, currentSlide]);

  const startProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    let timeElapsed = 0;
    const maxDuration = 15000; // 15 seconds fallback
    const interval = 100;

    progressTimerRef.current = setInterval(() => {
      timeElapsed += interval;
      const progressPercent = Math.min((timeElapsed / maxDuration) * 100, 100);
      setProgress(progressPercent);

      if (timeElapsed >= maxDuration) {
        clearInterval(progressTimerRef.current!);
        if (isPlaying && currentSlide < tourSlides.length - 1) {
          nextSlide();
        } else {
          setIsPlaying(false);
        }
      }
    }, interval);
  }, [currentSlide, isPlaying]);

  const nextSlide = useCallback(() => {
    if (currentSlide < tourSlides.length - 1) {
      setCurrentSlide(prev => prev + 1);
      setProgress(0);
    } else {
      setIsPlaying(false);
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setProgress(0);
    }
  }, [currentSlide]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    } else {
      setIsPlaying(true);
      speak(`${title}. ${content}`);
      startProgressTimer();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    }
  }, [isPlaying, title, content, speak, startProgressTimer]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setProgress(0);
    setIsPlaying(false);
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (isPlaying && isOpen) {
      speak(`${title}. ${content}`);
      startProgressTimer();
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentSlide, isOpen, isPlaying, title, content, speak, startProgressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {lang === 'es' ? 'Tour de IslaPOS' : 'IslaPOS Tour'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>{currentSlide + 1} / {tourSlides.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Slide Content */}
        <div className="px-6 py-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
            <p className="text-lg text-slate-600 leading-relaxed">{content}</p>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="px-6 pb-4">
          <div className="flex justify-center gap-2">
            {tourSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentSlide 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {lang === 'es' ? 'Anterior' : 'Previous'}
            </button>

            <button
              onClick={nextSlide}
              disabled={currentSlide === tourSlides.length - 1}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lang === 'es' ? 'Siguiente' : 'Next'}
              <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                  </svg>
                  {lang === 'es' ? 'Pausar' : 'Pause'}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {lang === 'es' ? 'Reproducir' : 'Play'}
                </>
              )}
            </button>

            {currentSlide === tourSlides.length - 1 && (
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                {lang === 'es' ? 'Finalizar' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
