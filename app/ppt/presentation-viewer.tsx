"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Home,
  Minimize2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  gsap,
  prefersReducedMotion,
  registerGsapPlugins,
  ScrollTrigger,
} from "@/animations/core";
import { cn } from "@/lib/utils";
import { PresentationVisual } from "./presentation-visuals";
import {
  PRESENTATION_SLIDES,
  PRESENTATION_TITLE,
  type PresentationSlide,
} from "./slides";

const TOTAL_SLIDES = PRESENTATION_SLIDES.length;

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#172033]">
      <span aria-hidden className="grid grid-cols-2 gap-0.5 rounded-[5px] bg-[#2855c7] p-1.5 shadow-[0_4px_12px_-6px_rgba(40,85,199,0.9)]">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="size-1.5 rounded-[1px] bg-white/95" />
        ))}
      </span>
      <span className="text-sm font-bold tracking-[-0.04em]">ExamOpt <span className="font-medium text-[#667085]">Studio</span></span>
    </span>
  );
}

function SlideCopy({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="relative z-10" data-ppt-enter>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2855c7]">{slide.eyebrow}</p>
      <h2
        id={`ppt-slide-${slide.number}`}
        className="mt-4 max-w-[13ch] text-balance text-[clamp(2rem,4.2vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#172033]"
        style={{ fontFamily: "var(--font-ppt-manrope)" }}
      >
        {slide.title}
      </h2>
      <p className="mt-5 max-w-[48ch] text-pretty text-sm leading-relaxed text-[#667085] sm:text-[15px]">
        {slide.description}
      </p>
      <ul className="mt-6 grid gap-2 text-[11px] font-medium text-[#172033] sm:text-xs">
        {slide.keyPoints.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#eaf0ff] text-[#2855c7]">✓</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PresentationSlideCard({
  slide,
  index,
  setRef,
}: {
  slide: PresentationSlide;
  index: number;
  setRef: (element: HTMLElement | null) => void;
}) {
  return (
    <article
      ref={setRef}
      id={`slide-${slide.number}`}
      aria-labelledby={`ppt-slide-${slide.number}`}
      className="flex min-h-full snap-start items-center p-3 py-7 sm:p-6 lg:p-8"
    >
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-[26px] border border-[#e1e6ef] bg-[#fdfefe] px-5 py-6 shadow-[0_24px_70px_-50px_rgba(23,32,51,0.45)] sm:px-8 sm:py-8 lg:min-h-[min(590px,calc(100svh-8.5rem))] lg:px-10 lg:py-8 xl:px-12 xl:py-10",
          slide.visual === "architecture" || slide.visual === "verification"
            ? "bg-[#f9fbff]"
            : "bg-[#fdfefe]",
        )}
        style={{ width: "min(100%, calc((100svh - 8.5rem) * 16 / 9))" }}
      >
        <div aria-hidden className="absolute -right-20 -top-24 size-72 rounded-full bg-[#eaf0ff]/70 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-24 size-64 rounded-full bg-[#f5f7fb]" />
        <div className="relative flex items-center justify-between gap-4 border-b border-[#e8ebf0] pb-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#667085]">
          <span>ExamOpt Studio · GLA HackVision 2.0</span>
          <span>{String(index + 1).padStart(2, "0")} / {String(TOTAL_SLIDES).padStart(2, "0")}</span>
        </div>

        <div className="relative grid gap-6 pt-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:pt-6">
          <SlideCopy slide={slide} />
          <div className="relative" data-ppt-enter>
            <PresentationVisual slide={slide} />
          </div>
        </div>

        {slide.note && (
          <p className="relative mt-4 border-t border-[#e8ebf0] pt-2 text-[9.5px] leading-relaxed text-[#667085]">
            {slide.note}
          </p>
        )}
      </div>
    </article>
  );
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

export function PresentationViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goToSlide = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(index, TOTAL_SLIDES - 1));
    const container = scrollRef.current;
    const slide = slideRefs.current[safeIndex];
    if (!container || !slide) return;

    container.scrollTo({
      top: slide.offsetTop,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewer.requestFullscreen();
      }
    } catch {
      // Fullscreen is optional; browser and embed policies may disallow it.
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let frame = 0;
    const updateActiveSlide = () => {
      frame = 0;
      const midpoint = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
      let nextIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slideRefs.current.forEach((slide, index) => {
        if (!slide) return;
        const distance = Math.abs(slide.offsetTop + slide.offsetHeight / 2 - midpoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextIndex = index;
        }
      });

      setCurrentIndex((current) => (current === nextIndex ? current : nextIndex));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateActiveSlide);
    };

    updateActiveSlide();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goToSlide(currentIndex + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToSlide(TOTAL_SLIDES - 1);
      } else if (event.key === "Escape" && document.fullscreenElement) {
        void document.exitFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, goToSlide]);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    const scroller = scrollRef.current;
    if (!viewer || !scroller || prefersReducedMotion()) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      const slides = Array.from(viewer.querySelectorAll<HTMLElement>("article[id^='slide-']"));
      slides.forEach((slide) => {
        const targets = slide.querySelectorAll<HTMLElement>("[data-ppt-enter]");
        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: slide,
              scroller,
              start: "top 72%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }, viewer);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, []);

  const progress = ((currentIndex + 1) / TOTAL_SLIDES) * 100;

  return (
    <div
      ref={viewerRef}
      className="flex h-[100svh] flex-col overflow-hidden bg-[#f7f8fa] text-[#172033]"
      style={{ fontFamily: "var(--font-ppt-inter)" }}
    >
      <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[#e5e7eb] bg-white/95 px-3 backdrop-blur sm:px-5">
        <Link href="/" className="shrink-0 rounded-lg px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2855c7]" aria-label="Return to ExamOpt Studio home">
          <Wordmark />
        </Link>
        <span className="hidden h-5 w-px bg-[#e5e7eb] sm:block" />
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-[#667085]">{PRESENTATION_TITLE}</p>
        <span className="hidden text-xs font-semibold tabular-nums text-[#172033] sm:inline">{currentIndex + 1} / {TOTAL_SLIDES}</span>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#172033] transition-colors hover:bg-[#f6f8fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2855c7]"
          aria-label={isFullscreen ? "Exit fullscreen presentation" : "Open fullscreen presentation"}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Expand className="size-3.5" />}
        </button>
        <Link
          href="/"
          className="hidden h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-[11px] font-semibold text-[#172033] transition-colors hover:bg-[#f6f8fc] sm:inline-flex"
        >
          <Home className="size-3" /> Exit
        </Link>
      </header>

      <div className="h-0.5 shrink-0 bg-[#eaf0ff]" aria-hidden>
        <div className="h-full bg-[#2855c7] transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <main
        ref={scrollRef}
        aria-label="ExamOpt Studio presentation slides"
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
      >
        {PRESENTATION_SLIDES.map((slide, index) => (
          <PresentationSlideCard
            key={slide.number}
            slide={slide}
            index={index}
            setRef={(element) => {
              slideRefs.current[index] = element;
            }}
          />
        ))}
      </main>

      <nav aria-label="Presentation navigation" className="z-20 flex min-h-15 shrink-0 items-center justify-between gap-2 border-t border-[#e5e7eb] bg-white px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={() => goToSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e5e7eb] px-2 text-[11px] font-semibold text-[#172033] transition-colors hover:bg-[#f6f8fc] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" /> <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a presentation slide">
          {PRESENTATION_SLIDES.map((slide, index) => (
            <button
              type="button"
              key={slide.number}
              role="tab"
              aria-selected={currentIndex === index}
              aria-label={`Go to slide ${slide.number}: ${slide.title}`}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2855c7]",
                currentIndex === index ? "w-5 bg-[#2855c7]" : "w-2 bg-[#c8d3e8] hover:bg-[#8fa7dd]",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goToSlide(currentIndex + 1)}
          disabled={currentIndex === TOTAL_SLIDES - 1}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#2855c7] px-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#1f46a8] disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight className="size-3.5" />
        </button>
      </nav>
    </div>
  );
}
