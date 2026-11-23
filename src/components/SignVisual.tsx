import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Hand,
  MoveRight,
} from "lucide-react";
import {
  getSignReference,
  orientationFromSign,
  type ReferenceView,
  viewLabel,
} from "@/lib/sign-references";

type Sign = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  image_key: string;
  steps?: string[];
};

const fallbackSteps = (sign: Sign) => [
  `Form the handshape: ${sign.handshape}.`,
  `Place the hand at ${sign.location}.`,
  sign.movement,
];

/**
 * Educational media panel used in both Learn and SignLab. It never turns a
 * prose description into a made-up gesture. Approved, per-sign media is shown
 * from the central registry; all other signs get an explicit review state and
 * their precise course instructions.
 */
export function SignVisual({ sign, className }: { sign: Sign; className?: string }) {
  const reference = getSignReference(sign.image_key);
  const availableViews = useMemo<ReferenceView[]>(() => {
    if (reference.status !== "verified") return ["primary"];
    const views = (Object.keys(reference.views) as ReferenceView[]).filter(
      (candidate) => reference.views[candidate],
    );
    return views.length ? views : ["primary"];
  }, [reference]);
  const [view, setView] = useState<ReferenceView>(availableViews[0]);
  const steps = sign.steps?.length ? sign.steps : fallbackSteps(sign);
  const [frame, setFrame] = useState(0);
  const orientation = orientationFromSign(sign.handshape, sign.location);
  const activeView = availableViews.includes(view) ? view : availableViews[0];
  const activeAsset = reference.status === "verified" ? reference.views[activeView] : undefined;

  return (
    <section
      className={`overflow-hidden bg-background ${className ?? ""}`}
      aria-label={`${sign.gloss} demonstration reference`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground/15 bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Hand className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="label-caps text-[10px]">Demonstration reference</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
            {reference.language}
          </span>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold">
            {orientation}
          </span>
        </div>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-b-2 border-foreground/10 px-3 pt-2"
        role="tablist"
        aria-label="Reference views"
      >
        {availableViews.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={activeView === candidate}
            onClick={() => setView(candidate)}
            className={`rounded-t-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              activeView === candidate
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary"
            }`}
          >
            {viewLabel(candidate)}
          </button>
        ))}
      </div>

      {activeAsset ? (
        <div className="relative aspect-[4/3] bg-secondary/30">
          <img
            src={activeAsset.src}
            alt={activeAsset.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-3 left-3 rounded-md bg-background/95 px-2 py-1 text-[10px] font-bold">
            Verified reference
          </div>
          {activeAsset.attribution ? (
            <a
              href={activeAsset.attribution.href}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 max-w-[58%] rounded-md bg-background/95 px-2 py-1 text-right text-[9px] leading-tight underline"
            >
              {activeAsset.attribution.label}
            </a>
          ) : null}
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center bg-secondary/30 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="label-caps mt-3 text-xs">Visual review required</p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {reference.reviewNote}
          </p>
          {reference.source ? (
            <a
              href={reference.source.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline"
            >
              {reference.source.label} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}

      <div className="border-t-2 border-foreground/15 bg-card p-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {activeAsset
            ? "Compare finger position with the written cue below."
            : "This written cue is not a substitute for an approved visual reference."}
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            aria-label="Previous instruction frame"
            onClick={() => setFrame((current) => Math.max(0, current - 1))}
            disabled={frame === 0}
            className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="label-caps text-[9px] text-muted-foreground">
              Frame {frame + 1} of {steps.length}
            </p>
            <p className="mt-1 text-xs leading-relaxed">{steps[frame]}</p>
          </div>
          <button
            type="button"
            aria-label="Next instruction frame"
            onClick={() => setFrame((current) => Math.min(steps.length - 1, current + 1))}
            disabled={frame === steps.length - 1}
            className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-3">
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Shape:</b> {sign.handshape}
          </p>
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Place:</b> {sign.location}
          </p>
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Move:</b> {sign.movement}
          </p>
        </div>
        {reference.status === "verified" ? (
          <div className="mt-2 rounded-md bg-secondary/60 px-2 py-1.5 text-[10px] leading-relaxed">
            <b>Finger position:</b> {reference.gesture.fingers} <b className="ml-1">Thumb:</b>{" "}
            {reference.gesture.thumb}
          </div>
        ) : null}
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <MoveRight className="h-3 w-3" /> Movement cues are shown as numbered written frames until
          approved media is linked.
        </p>
      </div>
    </section>
  );
}
