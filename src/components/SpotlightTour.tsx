import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export interface TourStep {
  /** CSS selector for the element to highlight. If omitted, shows a centered modal step. */
  selector?: string;
  /** Optional route to navigate to before showing this step. */
  route?: string;
  title: string;
  /** Single concise sentence. */
  body: string;
  /** Padding (px) around the highlighted element. */
  padding?: number;
}

interface Props {
  open: boolean;
  steps: TourStep[];
  onComplete: () => void;
  onSkip?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const DEFAULT_PADDING = 8;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_GAP = 16;

export function SpotlightTour({ open, steps, onComplete, onSkip }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const navigate = useNavigate();
  const location = useLocation();
  const findIntervalRef = useRef<number | null>(null);
  const remeasureTimeoutRef = useRef<number | null>(null);
  const { isMobile, setOpenMobile } = useSidebar();

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;

  // Reset to first step when opened
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  // On mobile, sync the sidebar drawer with the current step:
  // - open it when the step targets a sidebar nav item
  // - close it for all other steps so the spotlight isn't blocked
  useEffect(() => {
    if (!open || !isMobile) return;
    const targetsSidebar = !!step?.selector?.startsWith('[data-tour="nav-');
    setOpenMobile(targetsSidebar);
  }, [open, step, isMobile, setOpenMobile, location.pathname]);

  // Navigate when step requires a different route
  useEffect(() => {
    if (!open || !step) return;
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [open, step, location.pathname, navigate]);

  // Find target element rect — retries because route navigation/render takes time
  const measure = useCallback(() => {
    if (!step) return null;
    if (!step.selector) return null;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    };
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    setRect(null);

    if (findIntervalRef.current) {
      window.clearInterval(findIntervalRef.current);
      findIntervalRef.current = null;
    }
    if (remeasureTimeoutRef.current) {
      window.clearTimeout(remeasureTimeoutRef.current);
      remeasureTimeoutRef.current = null;
    }

    // Try repeatedly until target appears (route may still be mounting)
    let attempts = 0;
    const tryFind = () => {
      const r = measure();
      if (r) {
        setRect(r);
        if (step.selector) {
          const el = document.querySelector(step.selector) as HTMLElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

          remeasureTimeoutRef.current = window.setTimeout(() => {
            const r2 = measure();
            if (r2) setRect(r2);
            remeasureTimeoutRef.current = null;
          }, 350);
        }

        if (findIntervalRef.current) {
          window.clearInterval(findIntervalRef.current);
          findIntervalRef.current = null;
        }
      } else if (attempts++ > 40) {
        if (findIntervalRef.current) {
          window.clearInterval(findIntervalRef.current);
          findIntervalRef.current = null;
        }
      }
    };

    tryFind();
    findIntervalRef.current = window.setInterval(tryFind, 100);

    return () => {
      if (findIntervalRef.current) {
        window.clearInterval(findIntervalRef.current);
        findIntervalRef.current = null;
      }
      if (remeasureTimeoutRef.current) {
        window.clearTimeout(remeasureTimeoutRef.current);
        remeasureTimeoutRef.current = null;
      }
    };
  }, [open, step, measure, location.pathname]);

  // Track viewport + window resize / scroll
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      setViewport({ w, h });
      const r = measure();
      if (r) setRect(r);
    };

    // Sync immediately on open so mobile previews don't use a stale desktop width.
    onResize();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, measure]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip?.();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLast) onComplete();
        else setStepIndex((s) => s + 1);
      } else if (e.key === "ArrowLeft") {
        if (!isFirst) setStepIndex((s) => s - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isLast, isFirst, onComplete, onSkip]);

  if (!open || !step) return null;

  const padding = step.padding ?? DEFAULT_PADDING;
  const hasTarget = !!step.selector;
  const showSpotlight = hasTarget && rect !== null;

  // Compute tooltip position — width adapts to viewport on mobile
  const SIDE_MARGIN = 16;
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, viewport.w - SIDE_MARGIN * 2);
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    width: tooltipWidth,
    zIndex: 10001,
  };

  if (showSpotlight && rect) {
    const cutout = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
    const spaceBelow = viewport.h - (cutout.top + cutout.height);
    const spaceAbove = cutout.top;
    const placeBelow = spaceBelow > 220 || spaceBelow >= spaceAbove;

    let top: number;
    if (placeBelow) {
      top = Math.min(cutout.top + cutout.height + TOOLTIP_GAP, viewport.h - 240);
    } else {
      top = Math.max(cutout.top - TOOLTIP_GAP - 200, 16);
    }

    // Center horizontally on the target, but clamp to viewport
    let left = cutout.left + cutout.width / 2 - tooltipWidth / 2;
    left = Math.max(SIDE_MARGIN, Math.min(left, viewport.w - tooltipWidth - SIDE_MARGIN));
    tooltipStyle = { ...tooltipStyle, top, left };
  } else {
    // Centered fallback (intro / outro / target missing).
    // Use numeric top/left (not translate) so framer-motion's transform
    // animation doesn't override our centering on mobile.
    const TOOLTIP_HEIGHT_EST = 240;
    const top = Math.max(16, Math.round((viewport.h - TOOLTIP_HEIGHT_EST) / 2));
    const left = Math.max(SIDE_MARGIN, Math.round((viewport.w - tooltipWidth) / 2));
    tooltipStyle = { ...tooltipStyle, top, left };
  }

  // Spotlight via SVG mask
  const maskId = "tour-spotlight-mask";

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Dim layer with cutout */}
      <svg
        width={viewport.w}
        height={viewport.h}
        className="fixed inset-0 pointer-events-auto"
        onClick={(e) => {
          // Click outside tooltip = no-op (don't accidentally skip). Could be onSkip if desired.
          e.stopPropagation();
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {showSpotlight && rect && (
              <motion.rect
                initial={false}
                animate={{
                  x: rect.left - padding,
                  y: rect.top - padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.6 }}
                rx={10}
                ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="hsl(var(--background))"
          fillOpacity={0.78}
          mask={`url(#${maskId})`}
        />
        {/* Glow ring around the cutout */}
        {showSpotlight && rect && (
          <motion.rect
            initial={false}
            animate={{
              x: rect.left - padding,
              y: rect.top - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.6 }}
            rx={10}
            ry={10}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.6))" }}
          />
        )}
      </svg>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          style={tooltipStyle}
          className="pointer-events-auto rounded-xl border border-border bg-card shadow-2xl p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground text-base truncate">
                {step.title}
              </h3>
            </div>
            <button
              onClick={() => onSkip?.()}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
            {step.body}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {stepIndex + 1} / {steps.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStepIndex((s) => s - 1)}
                disabled={isFirst}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {isLast ? (
                <Button size="sm" onClick={onComplete} className="gap-1">
                  Finish <Sparkles className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStepIndex((s) => s + 1)} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
